"use client"

import { toast } from "@/hooks/use-toast"
import { GitHubRepository } from "@/lib/types"
import { getApiKeyFromLocalStorage, SSEUtils } from "@/lib/utils"

interface Props {
  issueNumber: number
  repo: GitHubRepository
  onStart: () => void
  onComplete: () => void
  onError: () => void
  onStatusUpdate: (status: string) => void
}

export default function GenerateResolutionPlanController({
  issueNumber,
  repo,
  onStart,
  onComplete,
  onError,
  onStatusUpdate,
}: Props) {
  const execute = async () => {
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

      onStart()
      const response = await fetch("/api/comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issueNumber,
          repo,
          apiKey,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start resolution plan generation")
      }

      const { jobId } = await response.json()
      const eventSource = new EventSource(`/api/sse?jobId=${jobId}`)

      eventSource.onmessage = (event) => {
        const status = SSEUtils.decodeStatus(event.data)
        onStatusUpdate(status)

        if (status === "Stream finished") {
          onStatusUpdate("GitHub comment created")
          eventSource.close()
          onComplete()
        } else if (
          status.startsWith("Completed") ||
          status.startsWith("Failed")
        ) {
          eventSource.close()
          onComplete()
        }
      }

      eventSource.onerror = (event) => {
        console.error("SSE connection failed:", event)
        eventSource.close()
        onError()
      }

      toast({
        title: "Resolution Plan Generation Started",
        description: "Analyzing the issue and generating a plan...",
      })
    } catch (error) {
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

  return { execute }
}
