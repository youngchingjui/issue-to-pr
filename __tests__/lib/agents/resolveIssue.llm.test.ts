/**
 * This test is excluded from regular CI -- see jest config for *.llm.*.ts exclusion.
 * It verifies the coder agent in resolveIssue correctly uses FileCheckTool after writing a file,
 * using the message transcript in __tests__/mocks/ChatCompletionMessageParam2.json.
 */
import { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import { ZodType } from "zod"

import messages from "@/__tests__/mocks/ChatCompletionMessageParam2.json"
import { TestAgent } from "@/lib/agents/testAgent"
import { createBranchTool } from "@/lib/tools/Branch"
import { createCommitTool } from "@/lib/tools/Commit"
import { createFileCheckTool } from "@/lib/tools/FileCheckTool"
import { createGetFileContentTool } from "@/lib/tools/GetFileContent"
import { createRipgrepSearchTool } from "@/lib/tools/RipgrepSearchTool"
import { createWriteFileContentTool } from "@/lib/tools/WriteFileContent"
import { Tool } from "@/lib/types"

// Runtime validator to ensure the imported JSON truly matches ChatCompletionMessageParam
const allowedRoles = new Set<ChatCompletionMessageParam["role"]>([
  "system",
  "user",
  "assistant",
  "tool",
  // The OpenAI type also allows the literal "function", include defensively
  "function" as ChatCompletionMessageParam["role"],
])

function assertIsChatParam(
  msg: unknown,
  idx: number
): asserts msg is ChatCompletionMessageParam {
  if (
    typeof msg !== "object" ||
    msg === null ||
    !("role" in msg) ||
    !allowedRoles.has(
      (msg as Record<string, unknown>)
        .role as ChatCompletionMessageParam["role"]
    )
  ) {
    throw new Error(
      `Item at index ${idx} is not a valid ChatCompletionMessageParam`
    )
  }
  // `content` may legally be string or null according to OpenAI spec; if present ensure type
  if (
    "content" in msg &&
    (msg as Record<string, unknown>)["content"] !== null &&
    typeof (msg as Record<string, unknown>)["content"] !== "string"
  ) {
    throw new Error(`Invalid content type for message at index ${idx}`)
  }
}

function getResolveIssueAgentTools(baseDir: string, defaultBranch = "main") {
  return [
    createGetFileContentTool(baseDir),
    createWriteFileContentTool(baseDir),
    createRipgrepSearchTool(baseDir),
    createBranchTool(baseDir),
    createCommitTool(baseDir, defaultBranch),
    createFileCheckTool(baseDir),
  ]
}

describe("resolveIssue LLM agent uses FileCheckTool after file write", () => {
  // Note: Requires OPENAI_API_KEY in env (or you can mock agent.llm.chat.completions.create for full CI isolation)
  it("calls FileCheckTool after writing a file (ChatCompletionMessageParam2.json)", async () => {
    // Validate the structure of the imported messages at runtime
    ;(messages as unknown[]).forEach(assertIsChatParam)

    const allMessages = messages as unknown as ChatCompletionMessageParam[]

    // Find the toolCallResult immediately after if present (may be toolCall then toolCallResult)
    const endIdx = 27
    const injected = allMessages.slice(0, endIdx + 1)

    // Setup agent as in resolveIssue: all tools, simple fake repo dir
    const baseDir = process.cwd() // Use CWD as dummy
    const agent = new TestAgent({
      messages: injected,
      apiKey: process.env.OPENAI_API_KEY || "sk-test",
      model: "gpt-4.1",
    })
    // Cast each tool to the generic shape expected by `addTool` to avoid
    // union-type incompatibilities at compile time.
    getResolveIssueAgentTools(baseDir).forEach((tool) =>
      agent.addTool(tool as unknown as Tool<ZodType, unknown>)
    )

    // Finish the full reasoning chain.  `runWithFunctions` will keep invoking the
    // underlying LLM until it produces a response **without** further
    // `tool_calls`, executing each requested tool along the way.
    const result = await agent.runWithFunctions()

    // Now, the messages returned should include a tool call for `file_check`.
    // OpenAI assistant responses that invoke tools include a `tool_calls` array.

    type ToolCall = {
      function: {
        name: string
      }
    }

    type EnhancedMessageWithToolCalls = ChatCompletionMessageParam & {
      tool_calls?: ToolCall[]
    }

    const hasToolCalls = (
      msg: ChatCompletionMessageParam
    ): msg is EnhancedMessageWithToolCalls =>
      Array.isArray((msg as Partial<EnhancedMessageWithToolCalls>).tool_calls)

    // Flatten all tool calls across messages and confirm at least one is
    // targeting the `file_check` function.
    const fileCheckCallFound = result.messages
      .filter(hasToolCalls)
      .some((msg) =>
        msg.tool_calls?.some((call) => call.function?.name === "file_check")
      )

    // At least one assistant message should contain a tool call for `file_check`.
    expect(fileCheckCallFound).toBe(true)
  }, 20000)
})
