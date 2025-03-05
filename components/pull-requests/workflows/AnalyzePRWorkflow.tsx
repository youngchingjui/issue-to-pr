"use client"

import { toast } from "@/hooks/use-toast"
import { SSEUtils } from "@/lib/utils"

interface Props {
  repoFullName: string
  pullNumber: number
  onStart: () => void
  onComplete: () => void
  onError: () => void
}

export default function AnalyzePRWorkflow({
  repoFullName,
  pullNumber,
  onStart,
  onComplete,
  onError,
}: Props) {
  const execute = async () => {
    try {
      onStart()

      const response = await fetch("/api/analyze-pr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoFullName,
          pullNumber,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start analysis")
      }

      const { jobId } = await response.json()
      const eventSource = new EventSource(`/api/sse?jobId=${jobId}`)

      eventSource.onmessage = (event) => {
        const decodedStatus = SSEUtils.decodeStatus(event.data)

        if (decodedStatus === "Stream finished") {
          eventSource.close()
          toast({
            title: "Analysis complete",
            description:
              "The pull request analysis has been completed successfully.",
          })
          onComplete()
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        toast({
          title: "Connection lost",
          description:
            "Lost connection to the analysis service. Please try again.",
          variant: "destructive",
        })
        onError()
      }
    } catch (error) {
      toast({
        title: "Analysis failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      })
      onError()
      console.error("Analysis failed: ", error)
    }
  }

  return { execute }
}
