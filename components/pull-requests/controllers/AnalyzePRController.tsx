"use client"

import { useRouter } from "next/navigation"

import { ToastAction } from "@/components/ui/toast"
import { toast } from "@/lib/hooks/use-toast"
import { getApiKeyFromLocalStorage } from "@/lib/utils/utils-common"

interface Props {
  repoFullName: string
  pullNumber: number
  onStart: () => void
  onComplete: () => void
  onError: () => void
}

export default function AnalyzePRController({
  repoFullName,
  pullNumber,
  onStart,
  onComplete,
  onError,
}: Props) {
  const router = useRouter()
  const execute = async () => {
    try {
      const key = getApiKeyFromLocalStorage?.() // Defensive in case imported function in older codebase
      if (!key) {
        toast({
          title: "API key not found",
          description: "Please save an OpenAI API key in settings.",
          variant: "destructive",
          action: (
            <ToastAction
              altText="Go to Settings"
              onClick={() => router.push("/settings")}
            >
              Go to Settings
            </ToastAction>
          ),
        })
        return
      }
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
