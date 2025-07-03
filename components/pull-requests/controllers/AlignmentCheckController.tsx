"use client"

import { toast } from "@/lib/hooks/use-toast"
import { AlignmentCheckRequest } from "@/lib/types/api/schemas"

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
      onStart()
      const body: AlignmentCheckRequest = {
        repoFullName,
        pullNumber,
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
