"use client"

import { toast } from "@/lib/hooks/use-toast"

interface Props {
  issueNumber: number
  repoFullName: string
  onStart: () => void
  onComplete: () => void
  onError: () => void
  branch?: string
}

export default function AutoResolveIssueController({
  issueNumber,
  repoFullName,
  onStart,
  onComplete,
  onError,
  branch,
}: Props) {
  const execute = async () => {
    try {
      onStart()
      const response = await fetch("/api/workflow/autoResolveIssue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueNumber, repoFullName, branch }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to run workflow")
      }

      toast({
        title: "Workflow Started",
        description: "Auto resolve issue workflow launched.",
      })

      onComplete()
    } catch (error) {
      toast({
        title: "Workflow Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      })
      onError()
      console.error("Auto resolve issue failed:", error)
    }
  }

  return { execute }
}

