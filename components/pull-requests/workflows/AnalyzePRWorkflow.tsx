"use client"

import { toast } from "@/hooks/use-toast"

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

      toast({
        title: "Analysis started",
        description:
          "The pull request analysis has been started and will complete in a minute.",
      })
      onComplete()
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
