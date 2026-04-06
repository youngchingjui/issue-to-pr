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
  createLLMResponseEvent: jest.fn().mockResolvedValue(undefined),
  createToolCallEvent: jest.fn().mockResolvedValue(undefined),
  createToolCallResultEvent: jest.fn().mockResolvedValue(undefined),
}))

import { runClaudeAgentInContainer } from "@/shared/lib/agents/claude/runClaudeAgentInContainer"
import { execInContainerWithDockerode } from "@/shared/lib/docker"
import {
  createErrorEvent,
  createLLMResponseEvent,
  createStatusEvent,
  createToolCallEvent,
  createToolCallResultEvent,
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
    // Call 1: write input JSON into the container
    mockExec.mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 })
    // Call 2: chown /workspace for the non-root agent user
    mockExec.mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 })
    // Call 3: git config for the agent user
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

  it("persists llmResponse events from runner output", async () => {
    const output = [
      JSON.stringify({ type: "llmResponse", content: "Here is my analysis" }),
      JSON.stringify({ type: "done" }),
    ].join("\n")

    mockExec.mockResolvedValueOnce({ stdout: output, stderr: "", exitCode: 0 })

    await runClaudeAgentInContainer(baseInput)

    expect(createLLMResponseEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: "test-workflow-id",
        content: "Here is my analysis",
      })
    )
  })

  it("persists toolCall events from runner output", async () => {
    const output = [
      JSON.stringify({
        type: "toolCall",
        toolName: "Read",
        toolCallId: "call-123",
        args: '{"file_path":"/src/index.ts"}',
      }),
      JSON.stringify({ type: "done" }),
    ].join("\n")

    mockExec.mockResolvedValueOnce({ stdout: output, stderr: "", exitCode: 0 })

    await runClaudeAgentInContainer(baseInput)

    expect(createToolCallEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: "test-workflow-id",
        toolName: "Read",
        toolCallId: "call-123",
        args: '{"file_path":"/src/index.ts"}',
      })
    )
  })

  it("persists toolCallResult events from runner output", async () => {
    const output = [
      JSON.stringify({
        type: "toolCallResult",
        toolCallId: "call-123",
        toolName: "Read",
        content: "file contents here",
      }),
      JSON.stringify({ type: "done" }),
    ].join("\n")

    mockExec.mockResolvedValueOnce({ stdout: output, stderr: "", exitCode: 0 })

    await runClaudeAgentInContainer(baseInput)

    expect(createToolCallResultEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: "test-workflow-id",
        toolCallId: "call-123",
        toolName: "Read",
        content: "file contents here",
      })
    )
  })

  it("extracts usage data from result events", async () => {
    const output = [
      JSON.stringify({
        type: "result",
        content: "Done",
        subtype: "success",
        usage: { input_tokens: 1000, output_tokens: 500 },
        totalCostUsd: 0.05,
        numTurns: 3,
        durationMs: 12000,
        modelUsage: { "claude-sonnet-4-20250514": { inputTokens: 1000, outputTokens: 500 } },
      }),
      JSON.stringify({ type: "done" }),
    ].join("\n")

    mockExec.mockResolvedValueOnce({ stdout: output, stderr: "", exitCode: 0 })

    const result = await runClaudeAgentInContainer(baseInput)

    expect(result.usage).toEqual({
      promptTokens: 1000,
      completionTokens: 500,
      totalCostUsd: 0.05,
      numTurns: 3,
      durationMs: 12000,
    })
    expect(result.models).toEqual(["claude-sonnet-4-20250514"])
  })
})
