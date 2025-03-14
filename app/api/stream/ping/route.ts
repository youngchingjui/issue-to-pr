import { NextRequest, NextResponse } from "next/server"

// Mark this route as dynamic
export const dynamic = "force-dynamic"
export const runtime = "edge"

export async function GET(request: NextRequest) {
  return new NextResponse(
    new ReadableStream({
      start(controller) {
        // Send initial ping
        controller.enqueue(`data: ping\n\n`)

        // Set up interval to send pings every second
        const interval = setInterval(() => {
          controller.enqueue(`data: ping\n\n`)
        }, 1000)

        // Clean up interval if the client disconnects
        request.signal.addEventListener("abort", () => {
          clearInterval(interval)
        })
      },
      cancel() {
        // This will be called when the client closes the connection
        console.log("Client disconnected from ping stream")
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }
  )
}
