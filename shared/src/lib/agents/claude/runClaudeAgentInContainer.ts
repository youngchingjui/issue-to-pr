/**
 * Worker-side function that runs the Claude Agent SDK runner script inside
 * a Docker container.
 *
 * The runner script is baked into the agent-base Docker image at
 * /usr/local/lib/claude-runner/index.mjs (see docker/agent-base/Dockerfile).
 * This function writes the input JSON into the container, starts the runner,
 * and parses its NDJSON output into workflow events.
 */

import { execInContainerWithDockerode } from "@/shared/lib/docker"
import {
  createErrorEvent,
  createStatusEvent,
} from "@/shared/lib/neo4j/services/event"

/** Path to the runner script inside the agent-base Docker image. */
const RUNNER_SCRIPT_PATH = "/usr/local/lib/claude-runner/index.mjs"

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
  // 1. Write input JSON to a file in the container
  const inputJson = JSON.stringify(input)
  // Use base64 encoding to avoid shell escaping issues with the JSON
  const inputBase64 = Buffer.from(inputJson).toString("base64")
  await execInContainerWithDockerode({
    name: containerName,
    command: `echo '${inputBase64}' | base64 -d > /tmp/claude-input.json`,
  })

  // 2. Execute the runner script (baked into the Docker image)
  await createStatusEvent({
    workflowId,
    content: "Starting Claude Agent SDK runner",
  })

  const { stdout, stderr, exitCode } = await execInContainerWithDockerode({
    name: containerName,
    command: `node ${RUNNER_SCRIPT_PATH} < /tmp/claude-input.json`,
  })

  // 3. Parse NDJSON output
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
