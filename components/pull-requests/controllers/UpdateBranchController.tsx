"use client"

import { toast } from "@/lib/hooks/use-toast"

interface Props {
  repoFullName: string
  pullNumber: number
  expectedHeadSha?: string
  onStart: () => void
  onComplete: () => void
  onError: () => void
}

export default function UpdateBranchController({
  repoFullName,
  pullNumber,
  expectedHeadSha,
  onStart,
  onComplete,
  onError,
}: Props) {
  const execute = async () => {
    try {
      onStart()
      const response = await fetch("/api/github/pulls/update-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName, pullNumber, expectedHeadSha }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(
          data?.error || "Failed to update branch from base branch"
        )
      }

      toast({
        title: "Branch updated",
        description:
          "The pull request branch was updated from the base branch.",
      })
      onComplete()
    } catch (error) {
      toast({
        title: "Update branch failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      })
      onError()
      console.error("Update branch failed: ", error)
    }
  }

  return { execute }
}
