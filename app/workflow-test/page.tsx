"use client"

import { useEffect, useState } from "react"

import { WorkflowState } from "@/lib/services/WorkflowEmitter"

export default function WorkflowTest() {
  const [workflowId, setWorkflowId] = useState<string>("")
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Not connected")

  const startWorkflow = async () => {
    try {
      setError(null)
      setWorkflowState(null)
      setConnectionStatus("Starting workflow...")
      console.log("Starting workflow...")
      const response = await fetch("/api/workflow-test", {
        method: "POST",
      })
      const data = await response.json()
      console.log("Workflow created:", data)
      setWorkflowId(data.workflowId)
    } catch (error) {
      console.error("Error starting workflow:", error)
      setError("Failed to start workflow")
      setConnectionStatus("Failed to start workflow")
    }
  }

  useEffect(() => {
    if (!workflowId) return

    let abortController: AbortController | null = null
    let reconnectAttempt = 0
    const maxReconnectAttempts = 5
    const reconnectDelay = 3000 // 3 seconds

    const setupFetchStream = async () => {
      try {
        // Clean up any existing connection
        if (abortController) {
          abortController.abort()
        }

        // Create a new abort controller for this connection
        abortController = new AbortController()

        setConnectionStatus(`Connecting to workflow: ${workflowId}...`)
        console.log("Setting up fetch stream for workflow:", workflowId)

        // Add cache-busting parameter to prevent caching issues
        const timestamp = new Date().getTime()
        const response = await fetch(
          `/api/workflow/${workflowId}?t=${timestamp}`,
          {
            method: "GET",
            signal: abortController.signal,
            headers: {
              Accept: "text/event-stream",
            },
          }
        )

        if (!response.ok) {
          throw new Error(
            `Server responded with ${response.status}: ${response.statusText}`
          )
        }

        if (!response.body) {
          throw new Error("Response body is null")
        }

        setConnected(true)
        setConnectionStatus("Connected to workflow updates")
        reconnectAttempt = 0 // Reset reconnect counter on successful connection

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        // Process the stream
        const processStream = async () => {
          try {
            while (true) {
              const { value, done } = await reader.read()

              if (done) {
                console.log("Stream closed by server")
                setConnected(false)
                setConnectionStatus("Connection closed by server")
                break
              }

              // Decode the chunk and add it to our buffer
              buffer += decoder.decode(value, { stream: true })

              // Process complete events in the buffer
              const lines = buffer.split("\n\n")
              buffer = lines.pop() || "" // Keep the last incomplete chunk in the buffer

              for (const line of lines) {
                if (!line.trim() || line.startsWith(":")) {
                  // Ignore empty lines and comments/heartbeats
                  console.log("Received heartbeat/ping")
                  continue
                }

                // Extract the data part
                const dataMatch = line.match(/^data: (.+)$/m)
                if (!dataMatch) continue

                const eventData = dataMatch[1]
                console.log("Received SSE message:", eventData)

                if (eventData === "Stream finished") {
                  console.log("Workflow completed, closing connection")
                  setConnected(false)
                  setConnectionStatus("Workflow completed")
                  abortController?.abort()
                  return
                }

                try {
                  const data = JSON.parse(eventData)
                  console.log("Parsed workflow state:", data)

                  if (data.error) {
                    console.error("Error in workflow:", data.error)
                    setError(data.error)
                    setConnected(false)
                    setConnectionStatus(`Error: ${data.error}`)
                    abortController?.abort()
                    return
                  }

                  setWorkflowState(data)
                } catch (error) {
                  console.error("Error processing message:", error)
                  setError("Failed to process workflow update")
                  setConnectionStatus("Error processing message")
                }
              }
            }
          } catch (error) {
            if (error.name === "AbortError") {
              console.log("Stream reading aborted")
            } else {
              console.error("Error reading stream:", error)
              setError("Error reading stream")
              setConnected(false)
              setConnectionStatus("Connection error")

              // Try to reconnect
              if (reconnectAttempt < maxReconnectAttempts) {
                reconnectAttempt++
                const delay = reconnectDelay * reconnectAttempt
                setConnectionStatus(
                  `Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempt}/${maxReconnectAttempts})...`
                )
                setTimeout(setupFetchStream, delay)
              } else {
                setConnectionStatus(
                  `Failed to connect after ${maxReconnectAttempts} attempts`
                )
                setError(
                  `Failed to connect after ${maxReconnectAttempts} attempts. Please try again.`
                )
              }
            }
          }
        }

        processStream()
      } catch (error) {
        console.error("Error setting up fetch stream:", error)
        setError(`Failed to connect: ${error.message}`)
        setConnected(false)
        setConnectionStatus(`Connection error: ${error.message}`)

        // Try to reconnect
        if (reconnectAttempt < maxReconnectAttempts) {
          reconnectAttempt++
          const delay = reconnectDelay * reconnectAttempt
          setConnectionStatus(
            `Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempt}/${maxReconnectAttempts})...`
          )
          setTimeout(setupFetchStream, delay)
        } else {
          setConnectionStatus(
            `Failed to connect after ${maxReconnectAttempts} attempts`
          )
          setError(
            `Failed to connect after ${maxReconnectAttempts} attempts. Please try again.`
          )
        }
      }
    }

    setupFetchStream()

    return () => {
      console.log("Cleaning up fetch stream")
      if (abortController) {
        abortController.abort()
        setConnected(false)
        setConnectionStatus("Disconnected")
      }

      // Send a cleanup request to the server
      fetch(`/api/workflow/${workflowId}`, { method: "DELETE" }).catch(
        (err) => {
          console.error("Failed to send cleanup request:", err)
        }
      )
    }
  }, [workflowId])

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Workflow Test</h1>
      <div className="flex items-center gap-4 mb-4">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={startWorkflow}
        >
          Start Workflow
        </button>
        {connected && (
          <span className="text-green-600 text-sm">
            ● Connected to workflow updates
          </span>
        )}
      </div>

      <div className="mt-2 mb-4 p-2 bg-gray-100 border border-gray-300 rounded text-sm">
        {connectionStatus}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {workflowState && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">
            Workflow Progress{" "}
            <span className="text-sm font-normal text-gray-600">
              ({workflowId})
            </span>
          </h2>
          <div className="space-y-4">
            {workflowState.stages.map((stage) => (
              <div key={stage.id} className="border p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">{stage.name}</h3>
                  <span className="text-sm">
                    {stage.completedAt
                      ? "Completed"
                      : stage.startedAt
                        ? "In Progress"
                        : "Pending"}
                  </span>
                </div>
                {stage.description && (
                  <p className="text-gray-600 text-sm mb-2">
                    {stage.description}
                  </p>
                )}
                {typeof stage.progress === "number" && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${stage.progress}%` }}
                    ></div>
                  </div>
                )}
                {stage.error && (
                  <p className="text-red-500 text-sm mt-2">{stage.error}</p>
                )}
              </div>
            ))}
          </div>
          {workflowState.error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {workflowState.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
