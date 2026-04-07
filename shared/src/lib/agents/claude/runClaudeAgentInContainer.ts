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
  createLLMResponseEvent,
  createStatusEvent,
  createToolCallEvent,
  createToolCallResultEvent,
} from "@/shared/lib/neo4j/services/event"

/** Path to the runner script inside the agent-base Docker image. */
const RUNNER_SCRIPT_PATH = "/usr/local/lib/claude-runner/index.mjs"

/** Non-root user created in the agent-base Dockerfile for running the SDK. */
const AGENT_USER = "agent:agent"

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

export interface RunClaudeAgentResult {
  messages: Array<{ role: string; content: string }>
  usage?: {
    promptTokens: number
    completionTokens: number
    totalCostUsd: number
    numTurns: number
    durationMs: number
  }
  /** Model names used during the run, derived from SDK modelUsage keys */
  models?: string[]
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

  // 2. Grant the non-root agent user ownership of /workspace so the SDK
  //    runner can read/write files. Setup commands run as root (default).
  const chownResult = await execInContainerWithDockerode({
    name: containerName,
    command: `chown -R ${AGENT_USER} /workspace`,
  })
  if (chownResult.exitCode !== 0) {
    const errorMsg =
      chownResult.stderr ||
      "Failed to grant the agent user access to /workspace"
    await createErrorEvent({ workflowId, content: errorMsg })
    throw new Error(`Claude agent setup failed: ${errorMsg}`)
  }

  // 3. Set git identity for the agent user. The global config set during
  //    container setup lives under /root and is invisible to non-root users.
  //    Use --file to avoid relying on $HOME being set in Docker exec.
  const gitConfigResult = await execInContainerWithDockerode({
    name: containerName,
    command:
      'git config --file /home/agent/.gitconfig user.name "Issue To PR agent" && git config --file /home/agent/.gitconfig user.email "agent@issuetopr.dev"',
    user: AGENT_USER,
  })
  if (gitConfigResult.exitCode !== 0) {
    const errorMsg =
      gitConfigResult.stderr ||
      "Failed to configure git identity for the agent user"
    await createErrorEvent({ workflowId, content: errorMsg })
    throw new Error(`Claude agent setup failed: ${errorMsg}`)
  }

  // 4. Execute the runner script as the non-root agent user.
  //    The Claude Agent SDK CLI refuses --dangerously-skip-permissions
  //    when running as root, so we must switch to a non-root user.
  await createStatusEvent({
    workflowId,
    content: "Starting Claude Agent SDK runner",
  })

  const { stdout, stderr, exitCode } = await execInContainerWithDockerode({
    name: containerName,
    command: `node ${RUNNER_SCRIPT_PATH} < /tmp/claude-input.json`,
    user: AGENT_USER,
  })

  // 5. Parse NDJSON output
  const messages: Array<{ role: string; content: string }> = []
  const lines = stdout.split("\n").filter((line) => line.trim().length > 0)
  let resultUsage: RunClaudeAgentResult["usage"]
  let resultModels: string[] | undefined
  // Track toolCallId → toolName so we can label results if the runner didn't
  const toolCallNames = new Map<string, string>()

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

        case "result": {
          if (event.content) {
            messages.push({ role: "assistant", content: event.content })
          }

          // Extract usage data from the result event
          if (event.usage) {
            resultUsage = {
              promptTokens: event.usage.input_tokens ?? 0,
              completionTokens: event.usage.output_tokens ?? 0,
              totalCostUsd: event.totalCostUsd ?? 0,
              numTurns: event.numTurns ?? 0,
              durationMs: event.durationMs ?? 0,
            }
          }

          // Extract model names from modelUsage keys
          if (event.modelUsage) {
            resultModels = Object.keys(event.modelUsage)
          }

          const summary = event.content
            ? `Agent completed: ${event.content.slice(0, 200)}`
            : `Agent finished (${event.subtype})`
          await createStatusEvent({ workflowId, content: summary })
          break
        }

        case "llmResponse":
          await createLLMResponseEvent({
            workflowId,
            content: event.content,
          })
          break

        case "toolCall":
          toolCallNames.set(event.toolCallId, event.toolName)
          await createToolCallEvent({
            workflowId,
            toolName: event.toolName,
            toolCallId: event.toolCallId,
            args: event.args ?? "",
          })
          break

        case "toolCallResult": {
          const resolvedToolName =
            event.toolName && event.toolName !== "unknown"
              ? event.toolName
              : toolCallNames.get(event.toolCallId) ?? "unknown"
          await createToolCallResultEvent({
            workflowId,
            toolCallId: event.toolCallId,
            toolName: resolvedToolName,
            content: event.content ?? "",
          })
          break
        }

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

  return { messages, usage: resultUsage, models: resultModels }
}
