import { http, HttpResponse } from "msw"

// Define handlers array
export const handlers = [
  // Handler for SSE endpoint
  http.get("/api/stream/ping", () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode("data: ping\n\n"))
      },
    })

    return new HttpResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  }),
]
