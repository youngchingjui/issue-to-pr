"use client"

import { toast } from "@/lib/hooks/use-toast"
import { AutoResolveIssueRequestSchema } from "@/lib/schemas/api"
import { RepoFullName } from "@/lib/types/github"

interface Props {
  issueNumber: number
  repoFullName: RepoFullName
  onStart: () => void
  onComplete: () => void
  onError: () => void
}

export default function AutoResolveIssueController({
  issueNumber,
  repoFullName,
  onStart,
  onComplete,
  onError,
}: Props) {
  const execute = async () => {
    try {
      onStart()
      const body = AutoResolveIssueRequestSchema.parse({
        issueNumber,
        repoFullName,
      })
      const response = await fetch("/api/workflow/autoResolveIssue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
