"use client"

import { toast } from "@/lib/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { useRouter } from "next/navigation"
import { AlignmentCheckRequest } from "@/lib/types/api/schemas"
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
  const router = useRouter()
  const execute = async () => {
    try {
      // Optionally retrieve the API key, but it's not required
      const key = getApiKeyFromLocalStorage()
      if (!key) {
        toast({
          title: "API key not found",
          description: "Please save an OpenAI API key in settings.",
          variant: "destructive",
          action: (
            <ToastAction altText="Go to Settings" onClick={() => router.push('/settings')}>Go to Settings</ToastAction>
          ),
        })
        return
      }

      onStart()
      const body: AlignmentCheckRequest = {
        repoFullName,
        pullNumber,
        openAIApiKey: key,
      }
      const response = await fetch("/api/workflow/alignment-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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
