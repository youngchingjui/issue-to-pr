"use client"

import { toast } from "@/lib/hooks/use-toast"
import { getApiKeyFromLocalStorage } from "@/lib/utils/utils-common"

interface Props {
  repoFullName: string
  pullNumber: number
  onStart: () => void
  onComplete: () => void
  onError: () => void
}

export default function AlignmentCheckController({
  repoFullName,
  pullNumber,
  onStart,
  onComplete,
  onError,
}: Props) {
  const execute = async () => {
    try {
      // Optionally retrieve the API key, but it's not required
      const key = getApiKeyFromLocalStorage()
      if (!key) {
        toast({
          title: "API key not found",
          description: "AlignmentCheck will run, but results will be better with an OpenAI API key. Please save one in settings if you haven't!",
          variant: "destructive",
        })
        // Proceed, don't return
      }

      onStart()
      const response = await fetch("/api/workflow/alignment-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoFullName, pullNumber, openAIApiKey: key || undefined }),
      })

      if (!response.ok) {
        throw new Error("Failed to start alignment check")
      }

      toast({
        title: "AlignmentCheck started",
        description: "The alignment check workflow has started for this PR.",
      })
      onComplete()
    } catch (error) {
      toast({
        title: "AlignmentCheck failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      })
      onError()
      console.error("AlignmentCheck failed: ", error)
    }
  }

  return { execute }
}
