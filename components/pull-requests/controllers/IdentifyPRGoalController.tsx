"use client"

import { toast } from "@/lib/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { useRouter } from "next/navigation"
import { getApiKeyFromLocalStorage } from "@/lib/utils/utils-common"

interface Props {
  repoFullName: string
  pullNumber: number
  onStart: () => void
  onComplete: () => void
  onError: () => void
}

export default function IdentifyPRGoalController({
  repoFullName,
  pullNumber,
  onStart,
  onComplete,
  onError,
}: Props) {
  const router = useRouter()

  const execute = async () => {
    try {
      const key = getApiKeyFromLocalStorage()
      if (!key) {
        toast({
          title: "API key not found",
          description: "Please save an OpenAI API key first.",
          variant: "destructive",
          action: (
            <ToastAction altText="Go to Settings" onClick={() => router.push('/settings')}>Go to Settings</ToastAction>
          ),
        })
        return
      }

      onStart()
      const response = await fetch("/api/analyze-pr", {
        method: "POST",
        body: JSON.stringify({ pullNumber, repoFullName, apiKey: key }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze pull request")
      }

      toast({
        title: "Analysis started",
        description: "The pull request analysis is being processed.",
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
