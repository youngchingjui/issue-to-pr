"use client"

import { useRouter } from "next/navigation"

import { toast } from "@/lib/hooks/use-toast"

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
      onStart()
      const response = await fetch("/api/analyze-pr", {
        method: "POST",
        body: JSON.stringify({ pullNumber, repoFullName }),
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
