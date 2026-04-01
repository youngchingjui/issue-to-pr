/**
 * Worker-side function that runs the Claude Agent SDK runner script inside
 * a Docker container.
 *
 * 1. Writes the runner script into the container
 * 2. Writes the input JSON to a file in the container
 * 3. Executes the runner script
 * 4. Parses NDJSON output and creates Neo4j workflow events
 */

import fs from "fs"
import path from "path"

import { execInContainerWithDockerode } from "@/shared/lib/docker"
import {
  createErrorEvent,
  createStatusEvent,
} from "@/shared/lib/neo4j/services/event"

interface RunnerInput {
  issueTitle: string
  issueBody: string
  issueComments: Array<{ user: string; body: string; createdAt: string }>
  directoryTree: string[]
  repoFullName: string
  defaultBranch: string
  workingBranch: string
  issueNumber: number
}

interface RunClaudeAgentParams {
  containerName: string
  workflowId: string
  input: RunnerInput
}

interface RunClaudeAgentResult {
  messages: Array<{ role: string; content: string }>
}

/**
 * Run the Claude Agent SDK runner inside the container and collect output.
 */
export async function runClaudeAgentInContainer({
  containerName,
  workflowId,
  input,
}: RunClaudeAgentParams): Promise<RunClaudeAgentResult> {
  // 1. Read the runner script source from disk and write it into the container
  const runnerPath = path.join(__dirname, "runner.mjs")
  const runnerSource = fs.readFileSync(runnerPath, "utf-8")

  // Write runner script to container via heredoc
  await execInContainerWithDockerode({
    name: containerName,
    command: `cat > /tmp/claude-runner.mjs << 'RUNNER_SCRIPT_EOF'\n${runnerSource}\nRUNNER_SCRIPT_EOF`,
  })

  // 2. Write input JSON to a file in the container
  const inputJson = JSON.stringify(input)
  // Use base64 encoding to avoid shell escaping issues with the JSON
  const inputBase64 = Buffer.from(inputJson).toString("base64")
  await execInContainerWithDockerode({
    name: containerName,
    command: `echo '${inputBase64}' | base64 -d > /tmp/claude-input.json`,
  })

  // 3. Execute the runner script
  await createStatusEvent({
    workflowId,
    content: "Starting Claude Agent SDK runner",
  })

  const { stdout, stderr, exitCode } = await execInContainerWithDockerode({
    name: containerName,
    command: "node /tmp/claude-runner.mjs < /tmp/claude-input.json",
  })

  // 4. Parse NDJSON output
  const messages: Array<{ role: string; content: string }> = []
  const lines = stdout.split("\n").filter((line) => line.trim().length > 0)

  for (const line of lines) {
    try {
      const event = JSON.parse(line)

      switch (event.type) {
        case "status":
          await createStatusEvent({
            workflowId,
            content: event.content,
          })
          break

        case "result":
          messages.push({ role: "assistant", content: event.content })
          await createStatusEvent({
            workflowId,
            content: `Agent completed: ${event.content.slice(0, 200)}`,
          })
          break

        case "error":
          await createErrorEvent({
            workflowId,
            content: event.content,
          })
          break

        case "done":
          await createStatusEvent({
            workflowId,
            content: "Claude agent finished successfully",
          })
          break
      }
    } catch {
      // Non-JSON line — could be SDK debug output, skip it
    }
  }

  if (exitCode !== 0) {
    const errorMsg = stderr || `Runner exited with code ${exitCode}`
    await createErrorEvent({ workflowId, content: errorMsg })
    throw new Error(`Claude agent runner failed: ${errorMsg}`)
  }

  if (stderr) {
    // Log stderr as a warning but don't fail
    await createStatusEvent({
      workflowId,
      content: `Runner stderr: ${stderr.slice(0, 500)}`,
    })
  }

  return { messages }
}
