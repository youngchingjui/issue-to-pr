import {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions"

export interface MockResponse {
  id: string
  object: "chat.completion"
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      content: string | null
      role: "assistant"
      tool_calls?: Array<{
        id: string
        type: "function"
        function: {
          name: string
          arguments: string
        }
      }>
    }
    finish_reason: string | null
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface MockStreamResponse {
  id: string
  object: "chat.completion.chunk"
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      content?: string
      role?: "assistant"
      tool_calls?: Array<{
        id?: string
        type?: "function"
        function?: {
          name?: string
          arguments?: string
        }
      }>
    }
    finish_reason: string | null
  }>
}

export class MockLLM {
  private responses: Map<string, MockResponse> = new Map()

  constructor(mockResponses?: Record<string, MockResponse>) {
    if (mockResponses) {
      this.responses = new Map(Object.entries(mockResponses))
    }
  }

  chat = {
    completions: {
      create: async <
        TParams extends
          | ChatCompletionCreateParamsNonStreaming
          | ChatCompletionCreateParamsStreaming,
      >(
        params: TParams
      ): Promise<
        TParams extends ChatCompletionCreateParamsStreaming
          ? AsyncGenerator<MockStreamResponse>
          : MockResponse
      > => {
        const key = this.generateKey(params.messages)
        const response =
          this.responses.get(key) || this.createDefaultResponse(key)

        if (params.stream) {
          return this.createStreamingResponse(
            response
          ) as TParams extends ChatCompletionCreateParamsStreaming
            ? AsyncGenerator<MockStreamResponse>
            : MockResponse
        }

        return response as TParams extends ChatCompletionCreateParamsStreaming
          ? AsyncGenerator<MockStreamResponse>
          : MockResponse
      },
    },
  }

  setResponse(messages: ChatCompletionMessageParam[], response: MockResponse) {
    const key = this.generateKey(messages)
    this.responses.set(key, response)
  }

  private generateKey(messages: ChatCompletionMessageParam[]): string {
    // Generate a deterministic key based on the messages
    return messages.map((msg) => `${msg.role}:${msg.content}`).join("|")
  }

  clearResponses() {
    this.responses.clear()
  }

  private createDefaultResponse(key: string): MockResponse {
    return {
      id: `mock-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "gpt-4",
      choices: [
        {
          index: 0,
          message: {
            content: `Mock response for: ${key}`,
            role: "assistant",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    }
  }

  private async *createStreamingResponse(
    response: MockResponse
  ): AsyncGenerator<MockStreamResponse> {
    const message = response.choices[0].message

    // First yield the role
    yield {
      id: response.id,
      object: "chat.completion.chunk",
      created: response.created,
      model: response.model,
      choices: [
        {
          index: 0,
          delta: { role: "assistant" },
          finish_reason: null,
        },
      ],
    }

    // If there's content, split it into words and stream them
    if (message.content) {
      const words = message.content.split(" ")
      for (const word of words) {
        yield {
          id: response.id,
          object: "chat.completion.chunk",
          created: response.created,
          model: response.model,
          choices: [
            {
              index: 0,
              delta: { content: word + " " },
              finish_reason: null,
            },
          ],
        }
      }
    }

    // If there are tool calls, stream them
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        yield {
          id: response.id,
          object: "chat.completion.chunk",
          created: response.created,
          model: response.model,
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [
                  {
                    id: toolCall.id,
                    type: "function",
                    function: {
                      name: toolCall.function.name,
                      arguments: toolCall.function.arguments,
                    },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        }
      }
    }

    // Final chunk with finish_reason
    yield {
      id: response.id,
      object: "chat.completion.chunk",
      created: response.created,
      model: response.model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: "stop",
        },
      ],
    }
  }
}
