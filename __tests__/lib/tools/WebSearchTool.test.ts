import { createWebSearchTool } from "@/lib/tools/WebSearchTool"

// Mock the OpenAI SDK
jest.mock("openai", () => {
  const responses = { create: jest.fn() }
  class OpenAIMock {
    responses = responses
    constructor(_: any) {}
  }
  return Object.assign(OpenAIMock, {
    __getMockResponses: () => responses,
    default: OpenAIMock,
  })
})

describe("WebSearchTool", () => {
  const apiKey = "test-key"

  beforeEach(async () => {
    const openaiModule: any = await import("openai")
    openaiModule.__getMockResponses().create.mockReset()
  })

  it("invokes OpenAI responses.create with web_search tool and returns summary and sources", async () => {
    const tool = createWebSearchTool({ apiKey })

    // Arrange mock response
    const mockOutput = [
      { type: "web_search_call", id: "ws_123", status: "completed", action: { sources: [{ url: "https://example.com/a" }, { url: "https://example.com/b" }] } },
      { type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: "Summary here" }] },
    ]

    const openaiModule: any = await import("openai")
    openaiModule.__getMockResponses().create.mockResolvedValue({
      id: "resp_1",
      output: mockOutput,
      output_text: "Summary here",
    })

    // Act
    const result = await tool.handler({
      query: "test query",
      contextSize: "high",
      allowedDomains: ["openai.com"],
    })

    // Assert
    expect(result.status).toBe("success")
    expect(result.summary).toBe("Summary here")
    expect(result.sources).toEqual([
      "https://example.com/a",
      "https://example.com/b",
    ])

    // Verify the OpenAI call shape
    const mockCreate = openaiModule.__getMockResponses().create
    expect(mockCreate).toHaveBeenCalled()
    const [params] = mockCreate.mock.calls[0]
    expect(params.tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "web_search" }),
      ])
    )
    expect(params.include).toEqual([
      "web_search_call.action.sources",
    ])
    expect(typeof params.input).toBe("string")
  })

  it("returns an error on thrown OpenAI errors with message preserved", async () => {
    const tool = createWebSearchTool({ apiKey })

    const openaiModule: any = await import("openai")
    openaiModule.__getMockResponses().create.mockRejectedValue(new Error("timeout"))

    const res = await tool.handler({ query: "x", contextSize: "low" })
    expect(res.status).toBe("error")
    expect(res.message).toMatch(/timeout/i)
  })
})

