import { ChatCompletionMessageParam } from "openai/resources/chat/completions"

import { TestAgent } from "@/lib/agents"
import rawMessages from "@/test-utils/mocks/messages6.json"

// Helper: map DB message event to ChatCompletionMessageParam
function toChatParam(e: Record<string, unknown>): ChatCompletionMessageParam {
  if (e.type === "userMessage")
    return { role: "user", content: e.content as string }
  if (e.type === "llmResponse")
    return { role: "assistant", content: e.content as string }
  if (e.type === "systemPrompt")
    return { role: "system", content: e.content as string }
  if (e.type === "toolCallResult")
    return {
      role: "tool",
      content: e.content as string,
      tool_call_id: e.toolCallId as string,
    }
  // Add more mappings as needed
  throw new Error(`Unknown message type: ${e.type}`)
}

const messages: ChatCompletionMessageParam[] = (
  rawMessages as Record<string, unknown>[]
).map(toChatParam)

describe("TestAgent manual LLM test (skipped by default)", () => {
  // Fixture originally from workflowRun ID: 75bc337f-0f87-4cb2-b16d-88e471951cda
  it.skip("should run linting step on a real message thread", async () => {
    // Only run manually! Remove .skip to run.
    const agent = new TestAgent({
      messages,
      apiKey: process.env.OPENAI_API_KEY,
    })
    const result = await agent.run()
    // You can inspect agent.messages or assert on the output
    expect(result.response).toBeDefined()
    // Optionally: console.log(agent.messages.at(-1))
  })
})
