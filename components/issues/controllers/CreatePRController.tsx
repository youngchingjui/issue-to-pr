"use client"

import { toast } from "@/hooks/use-toast"
import { GitHubRepository } from "@/lib/types"
import { getApiKeyFromLocalStorage } from "@/lib/utils"

interface Props {
  issueNumber: number
  repo: GitHubRepository
  onStart: () => void
  onComplete: () => void
  onError: () => void
}

export default function CreatePRController({
  issueNumber,
  repo,
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
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ issueNumber, repo, apiKey: key }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create pull request")
      }

      toast({
        title: "Pull Request Creation Started",
        description: "The issue is being analyzed and a PR will be created.",
      })

      onComplete()
      // Refresh the page after successful completion
      window.location.reload()
    } catch (error) {
      toast({
        title: "Pull Request Creation Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      })
      onError()
      console.error("PR creation failed: ", error)
    }
  }

  return { execute }
}
