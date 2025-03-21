"use client"

import { memo, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { BaseStreamEvent } from "@/lib/types/events"

interface StreamHandlerProps {
  workflowId: string
  onComplete?: (content: string) => void
  onError?: (error: Error) => void
  className?: string
}

function StreamHandlerComponent({
  workflowId,
  onComplete,
  onError,
  className = "",
}: StreamHandlerProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [content, setContent] = useState<string>("")
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3
  const retryDelay = 1000 // 1 second

  useEffect(() => {
    let source: EventSource | null = null
    let retryTimeout: NodeJS.Timeout | null = null

    const setupEventSource = () => {
      if (source) {
        source.close()
      }

      source = new EventSource(`/api/workflow/${workflowId}`)

      source.onmessage = (e) => {
        try {
          const event: BaseStreamEvent = JSON.parse(e.data)
          setContent((prev) => {
            const newContent = prev + (prev ? "\n" : "") + event.data
            return newContent
          })
        } catch (err) {
          console.error("Error parsing event:", err)
          onError?.(err as Error)
        }
      }

      source.onerror = (err) => {
        console.error("SSE Error:", err)
        source?.close()

        if (isStreaming && retryCount < maxRetries) {
          console.log(
            `Retrying connection (${retryCount + 1}/${maxRetries})...`
          )
          retryTimeout = setTimeout(
            () => {
              setRetryCount((prev) => prev + 1)
              setupEventSource()
            },
            retryDelay * Math.pow(2, retryCount)
          ) // Exponential backoff
        } else if (retryCount >= maxRetries) {
          onError?.(new Error("Max retry attempts reached"))
          setIsStreaming(false)
        }
      }

      source.onopen = () => {
        console.log("SSE connection opened")
        setRetryCount(0) // Reset retry count on successful connection
      }
    }

    if (isStreaming) {
      setupEventSource()
    }

    return () => {
      if (source) {
        source.close()
        // Cleanup workflow resources
        fetch(`/api/workflow/${workflowId}`, { method: "DELETE" }).catch(
          console.error
        )
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }
    }
  }, [isStreaming, workflowId, onError, retryCount])

  const handleStartStop = () => {
    if (isStreaming) {
      setIsStreaming(false)
    } else {
      setContent("")
      setRetryCount(0) // Reset retry count when manually starting
      setIsStreaming(true)
    }
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Button
          onClick={handleStartStop}
          variant={isStreaming ? "destructive" : "default"}
        >
          {isStreaming ? "Stop" : "Start"} Streaming
        </Button>
        <div className="text-sm text-gray-500">Workflow ID: {workflowId}</div>
      </div>
      <div className="relative min-h-[200px] w-full rounded-md border border-gray-200 bg-white p-4">
        <pre className="whitespace-pre-wrap font-mono text-sm">
          {content || "Waiting to start streaming..."}
        </pre>
      </div>
    </div>
  )
}

export const StreamHandler = memo(StreamHandlerComponent)
