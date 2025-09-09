"use client"

import { toast } from "@/lib/hooks/use-toast"
import { ResolveMergeConflictsRequest } from "@/lib/types/api/schemas"

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
      const body: ResolveMergeConflictsRequest = {
        repoFullName,
        pullNumber,
      }

      const response = await fetch("/api/workflow/resolve-merge-conflicts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error("Failed to start merge-conflict resolution")
      }

      toast({
        title: "Merge-conflict resolution started",
        description:
          "The workflow has started. You can monitor progress in Workflow Runs.",
      })
      onComplete()
    } catch (error) {
      toast({
        title: "Merge-conflict resolution failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      })
      onError()
      console.error("Resolve merge conflicts failed: ", error)
    }
  }

  return { execute }
}

