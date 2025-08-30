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
      const res = await fetch("/api/resolve-merge-conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName, pullNumber }),
      })
      if (!res.ok) throw new Error("Failed to start merge conflict resolver")
      toast({
        title: "Conflict resolution started",
        description:
          "We'll analyze the PR and attempt to resolve merge conflicts automatically.",
      })
      onComplete()
    } catch (err) {
      toast({
        title: "Failed to start",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      })
      onError()
    }
  }

  return { execute }
}

