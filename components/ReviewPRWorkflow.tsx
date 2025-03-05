"use client"

import { toast } from "@/hooks/use-toast"
import { getApiKeyFromLocalStorage } from "@/lib/utils"

interface Props {
  repoFullName: string
  pullNumber: number
  onStart: () => void
  onComplete: () => void
  onError: () => void
}

export default function ReviewPRWorkflow({
  repoFullName,
  pullNumber,
  onStart,
  onComplete,
  onError,
}: Props) {
  const execute = async () => {
    try {
      const key = getApiKeyFromLocalStorage()
      if (!key) {
        toast({
          title: "API key not found",
          description: "Please save an OpenAI API key first.",
          variant: "destructive",
        })
        return
      }

      onStart()
      const response = await fetch("/api/review", {
        method: "POST",
        body: JSON.stringify({ pullNumber, repoFullName, apiKey: key }),
      })

      if (!response.ok) {
        throw new Error("Failed to review pull request")
      }

      toast({
        title: "Review started",
        description: "The pull request review is being processed.",
      })

      onComplete()
    } catch (error) {
      toast({
        title: "Review failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      })
      onError()
      console.error("Review failed: ", error)
    }
  }

  return { execute }
}
