import { ChatCompletionMessageParam } from "openai/resources/chat/completions"

import rawMessages from "@/__tests__/mocks/messages6.json"
import { TestAgent } from "@/lib/agents"

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

describe("TestAgent manual LLM test", () => {
  it("should run linting step on a real message thread", async () => {
    const agent = new TestAgent({
      messages,
      apiKey: process.env.OPENAI_API_KEY,
    })
    const result = await agent.runOnce()
    // You can inspect agent.messages or assert on the output
    console.log(result.response)
    expect(result.response).toBeDefined()
    // Optionally: console.log(agent.messages.at(-1))
  })
})
