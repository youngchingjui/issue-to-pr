"use client"

import { autoResolveIssueAction } from "@/lib/actions/workflows/autoResolveIssue"
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
      const result = await autoResolveIssueAction({
        issueNumber,
        repoFullName,
        branch,
      })

      if (result.status !== "success") {
        throw new Error(result.message || "Failed to run workflow")
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

