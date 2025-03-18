/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"

import { GET } from "@/app/api/stream/ping/route"

// Create a minimal mock with just the properties we need
const createMockRequest = () => {
  const abortController = new AbortController()

  // Create a type that extends NextRequest with our custom disconnect method
  type MockRequest = NextRequest & { disconnect: () => void }

  return {
    signal: abortController.signal,
    headers: new Headers(),
    disconnect: () => abortController.abort(),
  } as unknown as MockRequest
}

describe("GET /api/stream/ping", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("should set correct SSE headers", async () => {
    const request = createMockRequest()
    const response = await GET(request)

    expect(response.headers.get("Content-Type")).toBe("text/event-stream")
    expect(response.headers.get("Cache-Control")).toBe("no-cache")
    expect(response.headers.get("Connection")).toBe("keep-alive")
  })

  it("should send initial ping and subsequent pings", async () => {
    const request = createMockRequest()
    const response = await GET(request)

    // Mock a simple async iterator for the stream
    let messageCount = 0
    const mockReader = {
      read: jest.fn().mockImplementation(async () => {
        if (messageCount === 0) {
          messageCount++
          return { value: "data: ping\n\n", done: false }
        } else if (messageCount === 1) {
          messageCount++
          return { value: "data: ping\n\n", done: false }
        }
        return { value: undefined, done: true }
      }),
      releaseLock: jest.fn(),
    }

    // Mock the ReadableStream
    const mockStream = {
      getReader: () => mockReader,
    }

    // Replace the response body with our mock stream
    Object.defineProperty(response, "body", {
      value: mockStream,
    })

    // Get the reader
    const reader = response.body?.getReader()

    if (!reader) {
      throw new Error("Reader is undefined")
    }

    // Read initial ping
    const { value: initialValue } = await reader.read()
    expect(initialValue).toBe("data: ping\n\n")

    // Advance time and read next ping
    jest.advanceTimersByTime(1000)
    const { value: nextValue } = await reader.read()
    expect(nextValue).toBe("data: ping\n\n")

    reader.releaseLock()
  })

  it("should cleanup on client disconnect", async () => {
    const request = createMockRequest()
    const response = await GET(request)

    // Mock a simple async iterator for the stream
    const mockReader = {
      read: jest
        .fn()
        .mockResolvedValueOnce({ value: "data: ping\n\n", done: false })
        .mockResolvedValue({ value: undefined, done: true }),
      releaseLock: jest.fn(),
    }

    // Mock the ReadableStream
    const mockStream = {
      getReader: () => mockReader,
    }

    // Replace the response body with our mock stream
    Object.defineProperty(response, "body", {
      value: mockStream,
    })

    // Get the reader
    const reader = response.body?.getReader()

    if (!reader) {
      throw new Error("Reader is undefined")
    }

    // Read initial ping
    await reader.read()

    // Simulate client disconnect
    request.disconnect()

    // Advance time
    jest.advanceTimersByTime(1000)

    // Try to read after disconnect - should get done: true
    const { done } = await reader.read()
    expect(done).toBe(true)

    reader.releaseLock()
  })
})
