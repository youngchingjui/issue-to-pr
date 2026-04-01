/**
 * Claude agent runner — worker-side output collection
 *
 * Requirements (docs/dev/claude-models.md):
 * - The worker starts a runner script inside the container and collects output
 * - Runner output is structured (NDJSON) and mapped to workflow events
 * - Errors from the runner are propagated as workflow error events
 * - The runner failing (non-zero exit) causes the workflow to fail
 */

jest.mock("@/shared/lib/docker", () => ({
  execInContainerWithDockerode: jest.fn(),
}))

jest.mock("@/shared/lib/neo4j/services/event", () => ({
  createStatusEvent: jest.fn().mockResolvedValue(undefined),
  createErrorEvent: jest.fn().mockResolvedValue(undefined),
}))

import { runClaudeAgentInContainer } from "@/shared/lib/agents/claude/runClaudeAgentInContainer"
import { execInContainerWithDockerode } from "@/shared/lib/docker"
import {
  createErrorEvent,
  createStatusEvent,
} from "@/shared/lib/neo4j/services/event"

const mockExec = execInContainerWithDockerode as jest.MockedFunction<
  typeof execInContainerWithDockerode
>

const baseInput = {
  containerName: "test-container",
  workflowId: "test-workflow-id",
  input: {
    issueTitle: "Test issue",
    issueBody: "Test body",
    issueComments: [],
    directoryTree: ["src/index.ts"],
    repoFullName: "owner/repo",
    defaultBranch: "main",
    workingBranch: "feature/test",
    issueNumber: 42,
  },
}

describe("Claude agent runner — output collection", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // First exec call writes the input JSON into the container
    mockExec.mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 })
  })

  it("collects the agent result from runner output", async () => {
    const output = [
      JSON.stringify({ type: "status", content: "Starting" }),
      JSON.stringify({ type: "result", content: "Changes applied" }),
      JSON.stringify({ type: "done" }),
    ].join("\n")

    mockExec.mockResolvedValueOnce({ stdout: output, stderr: "", exitCode: 0 })

    const result = await runClaudeAgentInContainer(baseInput)

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]).toEqual({
      role: "assistant",
      content: "Changes applied",
    })
  })

  it("propagates runner errors as workflow error events", async () => {
    const output = [
      JSON.stringify({ type: "error", content: "API key invalid" }),
    ].join("\n")

    mockExec.mockResolvedValueOnce({ stdout: output, stderr: "", exitCode: 1 })

    await expect(runClaudeAgentInContainer(baseInput)).rejects.toThrow()

    expect(createErrorEvent).toHaveBeenCalledWith(
      expect.objectContaining({ content: "API key invalid" })
    )
  })

  it("fails the workflow when the runner exits with non-zero code", async () => {
    mockExec.mockResolvedValueOnce({
      stdout: "",
      stderr: "module not found",
      exitCode: 1,
    })

    await expect(runClaudeAgentInContainer(baseInput)).rejects.toThrow(
      "module not found"
    )
  })

  it("gracefully ignores non-structured output from the runner", async () => {
    const output = [
      "debug: loading SDK",
      JSON.stringify({ type: "result", content: "Done" }),
      "debug: cleanup",
      JSON.stringify({ type: "done" }),
    ].join("\n")

    mockExec.mockResolvedValueOnce({ stdout: output, stderr: "", exitCode: 0 })

    const result = await runClaudeAgentInContainer(baseInput)

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].content).toBe("Done")
  })

  it("creates workflow status events from runner output", async () => {
    const output = JSON.stringify({ type: "done" })

    mockExec.mockResolvedValueOnce({ stdout: output, stderr: "", exitCode: 0 })

    await runClaudeAgentInContainer(baseInput)

    expect(createStatusEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: "test-workflow-id",
        content: "Starting Claude Agent SDK runner",
      })
    )
  })
})
