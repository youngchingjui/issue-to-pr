import { NextRequest, NextResponse } from "next/server"

// Mark this route as dynamic and edge compatible
export const dynamic = "force-dynamic"
export const runtime = "edge"

export async function GET(request: NextRequest) {
  console.log("SSE test request received")

  // Set up SSE stream
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Send initial message
  await writer.write(
    encoder.encode(`data: {"message": "SSE test connection established"}\n\n`)
  )
  console.log("Initial test message sent")

  // Send a ping
  await writer.write(encoder.encode(`: ping\n\n`))

  // Set up a counter to send messages
  let counter = 0
  const interval = setInterval(async () => {
    try {
      counter++
      console.log(`Sending test message ${counter}`)
      await writer.write(
        encoder.encode(
          `data: {"message": "Test message ${counter}", "timestamp": "${new Date().toISOString()}"}\n\n`
        )
      )

      // End after 10 messages
      if (counter >= 10) {
        console.log("Test complete, closing connection")
        await writer.write(
          encoder.encode(`data: {"message": "Test complete"}\n\n`)
        )
        clearInterval(interval)
        await writer.close()
      }
    } catch (error) {
      console.error("Error sending test message:", error)
      clearInterval(interval)
    }
  }, 2000) // Send a message every 2 seconds

  // Clean up when the client disconnects
  request.signal.addEventListener("abort", () => {
    console.log("Client disconnected from SSE test")
    clearInterval(interval)
  })

  const response = new NextResponse(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })

  return response
}
