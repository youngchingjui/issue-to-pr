"use client"

import { useCallback, useRef, useState } from "react"

import {
  StreamingDrawer,
  type StreamingDrawerControls,
} from "@/components/streaming/StreamingDrawer"
import type { WorkflowStage } from "@/components/ui/workflow-progress"
import { toast } from "@/hooks/use-toast"
import { CommentRequestSchema } from "@/lib/schemas/api"
import { getApiKeyFromLocalStorage, SSEUtils } from "@/lib/utils/utils-common"

// Define workflow stages
const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: "setup",
    title: "Setup",
    description: "Preparing environment and validating inputs",
    status: "pending",
  },
  {
    id: "analysis",
    title: "Analysis",
    description: "Analyzing issue and context",
    status: "pending",
  },
  {
    id: "planning",
    title: "Planning",
    description: "Generating resolution plan",
    status: "pending",
  },
  {
    id: "completion",
    title: "Completion",
    description: "Finalizing and saving results",
    status: "pending",
  },
]

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
}: Props): {
  execute: () => Promise<void>
  drawer: React.ReactNode
} {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const drawerControls = useRef<StreamingDrawerControls>()

  const handleDrawerMount = useCallback((controls: StreamingDrawerControls) => {
    drawerControls.current = controls
  }, [])

  const updateStage = (stageId: string, status: WorkflowStage["status"]) => {
    if (!drawerControls.current) return

    const now = new Date()
    drawerControls.current.updateStageStatus(stageId, {
      status,
      ...(status === "in-progress" ? { startTime: now } : {}),
      ...(status === "complete" || status === "error" ? { endTime: now } : {}),
    })
  }

  const initializeStages = () => {
    if (!drawerControls.current) return
    drawerControls.current.updateStages(WORKFLOW_STAGES)
  }

  const mockExecution = async () => {
    if (!drawerControls.current) return

    const controls = drawerControls.current
    controls.clearMessages()
    controls.setLoading(true)
    initializeStages()

    // Update stages and stream messages with delays
    updateStage("setup", "in-progress")
    await new Promise((resolve) => setTimeout(resolve, 1000))
    controls.addMessage(MOCK_MESSAGES[0])
    updateStage("setup", "complete")

    updateStage("analysis", "in-progress")
    await new Promise((resolve) => setTimeout(resolve, 1000))
    controls.addMessage(MOCK_MESSAGES[1])
    controls.addMessage(MOCK_MESSAGES[2])
    updateStage("analysis", "complete")

    updateStage("planning", "in-progress")
    await new Promise((resolve) => setTimeout(resolve, 1000))
    controls.addMessage(MOCK_MESSAGES[3])
    controls.addMessage(MOCK_MESSAGES[4])
    updateStage("planning", "complete")

    updateStage("completion", "in-progress")
    await new Promise((resolve) => setTimeout(resolve, 1000))
    controls.addMessage(MOCK_MESSAGES[5])
    updateStage("completion", "complete")

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
          title: "API Key Required",
          description: "Please set your API key in the settings.",
        })
        return
      }

      setIsDrawerOpen(true)
      onStart()

      if (drawerControls.current) {
        drawerControls.current.clearMessages()
        drawerControls.current.setLoading(true)
        initializeStages()
        updateStage("setup", "in-progress")
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
        const data = await response.json()
        throw new Error(
          data.error || "Failed to start resolution plan generation"
        )
      }

      const { jobId } = await response.json()

      const eventSource = new EventSource(`/api/sse?jobId=${jobId}`)

      updateStage("setup", "complete")
      updateStage("analysis", "in-progress")

      eventSource.onmessage = (event) => {
        const status = SSEUtils.decodeStatus(event.data)

        if (drawerControls.current) {
          if (status.toLowerCase().includes("analyzing")) {
            updateStage("analysis", "in-progress")
          } else if (status.toLowerCase().includes("planning")) {
            updateStage("analysis", "complete")
            updateStage("planning", "in-progress")
          }

          drawerControls.current.addMessage({
            type: status.startsWith("Error:") ? "error" : "llm",
            content: status,
          })
        }

        if (status === "Stream finished") {
          eventSource.close()
          if (drawerControls.current) {
            drawerControls.current.setLoading(false)
            updateStage("planning", "complete")
            updateStage("completion", "complete")
          }
          onComplete()
        } else if (
          status.startsWith("Completed") ||
          status.startsWith("Failed")
        ) {
          eventSource.close()
          if (drawerControls.current) {
            drawerControls.current.setLoading(false)
            updateStage("planning", "complete")
            updateStage(
              "completion",
              status.startsWith("Failed") ? "error" : "complete"
            )
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
          // Mark all incomplete stages as error
          WORKFLOW_STAGES.forEach((stage) => {
            if (stage.status !== "complete") {
              updateStage(stage.id, "error")
            }
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
        // Mark all incomplete stages as error
        WORKFLOW_STAGES.forEach((stage) => {
          if (stage.status !== "complete") {
            updateStage(stage.id, "error")
          }
        })
      }

      toast({
        title: "Resolution Plan Generation Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while generating the resolution plan.",
      })

      onError()
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
