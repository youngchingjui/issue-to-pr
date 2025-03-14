"use client"

import { useEffect, useState } from "react"

export default function SseTest() {
  const [messages, setMessages] = useState<string[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log("Setting up SSE test connection")
    let eventSource: EventSource | null = null

    try {
      eventSource = new EventSource("/api/sse-test")
      console.log("EventSource created:", eventSource)

      // Log readyState changes
      const checkReadyState = () => {
        const states = ["CONNECTING", "OPEN", "CLOSED"]
        console.log(
          `EventSource readyState: ${states[eventSource?.readyState || 0]} (${
            eventSource?.readyState
          })`
        )
        if (eventSource?.readyState !== 2) {
          // Not closed
          setTimeout(checkReadyState, 1000)
        }
      }
      checkReadyState()

      eventSource.onopen = () => {
        console.log("SSE test connection opened")
        setConnected(true)
        setError(null)
      }

      eventSource.onmessage = (event) => {
        console.log("Received SSE test message:", event.data)
        setMessages((prev) => [...prev, event.data])
      }

      eventSource.onerror = (err) => {
        console.error("SSE test connection error:", err)
        setError("Connection error")
        setConnected(false)
        eventSource?.close()
      }
    } catch (err) {
      console.error("Error setting up SSE test:", err)
      setError("Failed to connect")
    }

    return () => {
      console.log("Cleaning up SSE test connection")
      eventSource?.close()
      setConnected(false)
    }
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">SSE Test</h1>

      <div className="mb-4">
        <span className={connected ? "text-green-600" : "text-red-600"}>
          {connected ? "● Connected" : "○ Disconnected"}
        </span>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="border rounded p-4">
        <h2 className="text-xl mb-2">Messages</h2>
        {messages.length === 0 ? (
          <p className="text-gray-500">No messages received yet...</p>
        ) : (
          <ul className="space-y-2">
            {messages.map((msg, index) => (
              <li key={index} className="border-b pb-2">
                <pre className="whitespace-pre-wrap text-sm">{msg}</pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
