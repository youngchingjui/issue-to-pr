"use client"

import { toast } from "@/lib/hooks/use-toast"

interface Props {
  repoFullName: string
  pullNumber: number
  onStart: () => void
  onComplete: () => void
  onError: () => void
}

export default function ResolveMergeConflictsController({
  repoFullName,
  pullNumber,
  onStart,
  onComplete,
  onError,
}: Props) {
  const execute = async () => {
    try {
      onStart()
      const response = await fetch(
        "/api/workflow/resolve-merge-conflicts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoFullName, pullNumber }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to start resolve-merge-conflicts workflow")
      }

      toast({
        title: "Merge-conflict analysis started",
        description:
          "We are gathering the PR, linked issue, comments and diff. Check Workflow Runs for details.",
      })

      onComplete()
    } catch (error) {
      toast({
        title: "Failed to start",
        description:
          error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
      onError()
      console.error("Resolve merge conflicts failed: ", error)
    }
  }

  return { execute }
}

