"use client"

import { toast } from "@/lib/hooks/use-toast"

interface Props {
  repoFullName: string
  pullNumber: number
  onStart: () => void
  onComplete: () => void
  onError: () => void
}

export default function AutoFixPRController({
  repoFullName,
  pullNumber,
  onStart,
  onComplete,
  onError,
}: Props) {
  const execute = async () => {
    try {
      onStart()
      const response = await fetch("/api/workflow/auto-fix-pull-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName, pullNumber }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to start auto-fix workflow")
      }

      toast({
        title: "Auto-fix started",
        description:
          "The agent is attempting to fix this PR based on review comments.",
      })
      onComplete()
    } catch (error) {
      toast({
        title: "Auto-fix failed",
        description:
          error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
      onError()
      console.error("Auto-fix PR failed:", error)
    }
  }

  return { execute }
}

