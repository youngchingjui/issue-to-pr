"use client"

import { useEffect, useState } from "react"

import { Button } from "./ui/button"

interface StreamHandlerProps {
  workflowId: string
  onComplete?: (content: string) => void
  onError?: (error: Error) => void
  className?: string
}

// Mock data for testing
const mockStreamData = [
  "Analyzing issue content...",
  "Identifying key points...",
  "Generating response...",
  "Here is a detailed response to your issue:",
  "Thank you for raising this concern.",
  "We will look into this matter carefully.",
  "Please let us know if you need any clarification.",
]

export function StreamHandler({
  workflowId,
  onComplete,
  onError,
  className = "",
}: StreamHandlerProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [content, setContent] = useState<string>("")
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (isStreaming && currentIndex < mockStreamData.length) {
      intervalId = setInterval(() => {
        setContent((prev) => {
          const newContent =
            prev + (prev ? "\n" : "") + mockStreamData[currentIndex]
          if (currentIndex === mockStreamData.length - 1 && onComplete) {
            onComplete(newContent)
          }
          return newContent
        })
        setCurrentIndex((prev) => prev + 1)
      }, 1000) // Stream a new line every second
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [isStreaming, currentIndex, onComplete])

  const handleStartStop = () => {
    if (isStreaming) {
      setIsStreaming(false)
    } else {
      setContent("")
      setCurrentIndex(0)
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
