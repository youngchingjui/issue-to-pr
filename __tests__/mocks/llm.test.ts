import { ChatCompletionMessageParam } from "openai/resources/chat/completions"

import { MockLLM, MockResponse, MockStreamResponse } from "@/lib/mocks/MockLLM"

describe("MockLLM", () => {
  let llm: MockLLM

  beforeEach(() => {
    llm = new MockLLM()
  })

  describe("Non-streaming responses", () => {
    it("should return default response when no mock is set", async () => {
      const messages: ChatCompletionMessageParam[] = [
        { role: "user", content: "Hello" },
      ]

      const response = (await llm.chat.completions.create({
        messages,
        model: "gpt-4",
        stream: false,
      })) as MockResponse

      expect(response).toHaveProperty("choices")
      expect(response.choices[0].message.content).toBe(
        "Mock response for: user:Hello"
      )
      expect(response.choices[0].message.role).toBe("assistant")
    })

    it("should return custom mock response when set", async () => {
      const messages: ChatCompletionMessageParam[] = [
        { role: "user", content: "Test prompt" },
      ]

      const mockResponse: MockResponse = {
        choices: [
          {
            message: {
              content: "Custom mock response",
              role: "assistant",
            },
          },
        ],
      }

      llm.setResponse(messages, mockResponse)

      const response = (await llm.chat.completions.create({
        messages,
        model: "gpt-4",
        stream: false,
      })) as MockResponse

      expect(response).toEqual(mockResponse)
    })
  })

  describe("Streaming responses", () => {
    it("should stream response content word by word", async () => {
      const messages: ChatCompletionMessageParam[] = [
        { role: "user", content: "Test prompt" },
      ]

      const mockResponse: MockResponse = {
        choices: [
          {
            message: {
              content: "This is a test response",
              role: "assistant",
            },
          },
        ],
      }

      llm.setResponse(messages, mockResponse)

      const stream = await llm.chat.completions.create({
        messages,
        model: "gpt-4",
        stream: true,
      })

      const chunks: MockStreamResponse[] = []
      for await (const chunk of stream as AsyncGenerator<MockStreamResponse>) {
        chunks.push(chunk)
      }

      // First chunk should be the role
      expect(chunks[0].choices[0].delta.role).toBe("assistant")

      // Following chunks should be words
      expect(chunks[1].choices[0].delta.content).toBe("This ")
      expect(chunks[2].choices[0].delta.content).toBe("is ")
      expect(chunks[3].choices[0].delta.content).toBe("a ")
      expect(chunks[4].choices[0].delta.content).toBe("test ")
      expect(chunks[5].choices[0].delta.content).toBe("response ")
    })

    it("should stream tool calls", async () => {
      const messages: ChatCompletionMessageParam[] = [
        { role: "user", content: "Use a tool" },
      ]

      const mockResponse: MockResponse = {
        choices: [
          {
            message: {
              content: "",
              role: "assistant",
              tool_calls: [
                {
                  id: "call_123",
                  type: "function",
                  function: {
                    name: "testTool",
                    arguments: JSON.stringify({ arg1: "value1" }),
                  },
                },
              ],
            },
          },
        ],
      }

      llm.setResponse(messages, mockResponse)

      const stream = await llm.chat.completions.create({
        messages,
        model: "gpt-4",
        stream: true,
      })

      const chunks: MockStreamResponse[] = []
      for await (const chunk of stream as AsyncGenerator<MockStreamResponse>) {
        chunks.push(chunk)
      }

      // First chunk should be the role
      expect(chunks[0].choices[0].delta.role).toBe("assistant")

      // Second chunk should be the tool call
      expect(chunks[1].choices[0].delta.tool_calls).toBeDefined()
      expect(chunks[1].choices[0].delta.tool_calls![0].function!.name).toBe(
        "testTool"
      )
    })
  })

  it("should clear responses", async () => {
    const messages: ChatCompletionMessageParam[] = [
      { role: "user", content: "Test prompt" },
    ]

    const mockResponse: MockResponse = {
      choices: [
        {
          message: {
            content: "Custom mock response",
            role: "assistant",
          },
        },
      ],
    }

    llm.setResponse(messages, mockResponse)
    llm.clearResponses()

    const response = (await llm.chat.completions.create({
      messages,
      model: "gpt-4",
      stream: false,
    })) as MockResponse

    expect(response.choices[0].message.content).toBe(
      "Mock response for: user:Test prompt"
    )
  })
})
