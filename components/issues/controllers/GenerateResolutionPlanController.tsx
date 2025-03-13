"use client"

import { useCallback, useRef, useState } from "react"

import {
  StreamingDrawer,
  type StreamingDrawerControls,
} from "@/components/streaming/StreamingDrawer"
import { toast } from "@/hooks/use-toast"
import { CommentRequestSchema } from "@/lib/schemas/api"
import { getApiKeyFromLocalStorage, SSEUtils } from "@/lib/utils/utils-common"

interface Props {
  issueNumber: number
  repoFullName: string
  onStart: () => void
  onComplete: () => void
  onError: () => void
  mockMode?: boolean
}

const MOCK_MESSAGES = [
  { type: "system", content: "Starting resolution plan generation..." },
  { type: "system", content: "Analyzing issue #123..." },
  {
    type: "llm",
    content:
      "I've reviewed the issue and here's my proposed plan:\n\n1. First, we'll need to investigate the root cause\n2. Then, implement a fix\n3. Finally, add tests to prevent regression",
  },
  { type: "system", content: "Generating implementation details..." },
  {
    type: "llm",
    content:
      "Here are the specific steps:\n\n```typescript\n// Example code\nfunction fix() {\n  // Implementation\n}\n```",
  },
  { type: "system", content: "Plan generation complete!" },
] as const

export default function GenerateResolutionPlanController({
  issueNumber,
  repoFullName,
  onStart,
  onComplete,
  onError,
  mockMode = false,
}: Props) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const drawerControls = useRef<StreamingDrawerControls>()

  const handleDrawerMount = useCallback((controls: StreamingDrawerControls) => {
    drawerControls.current = controls
  }, [])

  const mockExecution = async () => {
    if (!drawerControls.current) return

    const controls = drawerControls.current
    controls.clearMessages()
    controls.setLoading(true)

    // Simulate streaming messages with delays
    for (const message of MOCK_MESSAGES) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      controls.addMessage(message)
    }

    controls.setLoading(false)
    onComplete()
  }

  const execute = async () => {
    if (mockMode) {
      setIsDrawerOpen(true)
      onStart()
      await mockExecution()
      return
    }

    try {
      const apiKey = getApiKeyFromLocalStorage()
      if (!apiKey) {
        toast({
          title: "API key not found",
          description: "Please save an OpenAI API key first.",
          variant: "destructive",
        })
        return
      }

      setIsDrawerOpen(true)
      onStart()

      if (drawerControls.current) {
        drawerControls.current.clearMessages()
        drawerControls.current.setLoading(true)
        drawerControls.current.addMessage({
          type: "system",
          content: "Starting resolution plan generation...",
        })
      }

      const requestBody = CommentRequestSchema.parse({
        issueNumber,
        repoFullName,
        apiKey,
      })
      const response = await fetch("/api/comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error("Failed to start resolution plan generation")
      }

      const { jobId } = await response.json()
      const eventSource = new EventSource(`/api/sse?jobId=${jobId}`)

      eventSource.onmessage = (event) => {
        const status = SSEUtils.decodeStatus(event.data)

        if (drawerControls.current) {
          drawerControls.current.addMessage({
            type: status.startsWith("Error:") ? "error" : "llm",
            content: status,
          })
        }

        if (status === "Stream finished") {
          eventSource.close()
          if (drawerControls.current) {
            drawerControls.current.setLoading(false)
          }
          onComplete()
        } else if (
          status.startsWith("Completed") ||
          status.startsWith("Failed")
        ) {
          eventSource.close()
          if (drawerControls.current) {
            drawerControls.current.setLoading(false)
          }
          onComplete()
        }
      }

      eventSource.onerror = (event) => {
        console.error("SSE connection failed:", event)
        eventSource.close()
        if (drawerControls.current) {
          drawerControls.current.setLoading(false)
          drawerControls.current.addMessage({
            type: "error",
            content: "Connection failed. Please try again.",
          })
        }
        onError()
      }

      toast({
        title: "Resolution Plan Generation Started",
        description: "Analyzing the issue and generating a plan...",
      })
    } catch (error) {
      if (drawerControls.current) {
        drawerControls.current.setLoading(false)
        drawerControls.current.addMessage({
          type: "error",
          content:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        })
      }

      toast({
        title: "Resolution Plan Generation Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      })
      onError()
      console.error("Resolution plan generation failed:", error)
    }
  }

  return {
    execute,
    drawer: (
      <StreamingDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Resolution Plan Generation"
        onMount={handleDrawerMount}
      />
    ),
  }
}
