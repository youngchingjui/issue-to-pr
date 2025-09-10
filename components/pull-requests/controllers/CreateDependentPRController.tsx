"use client"

import { createDependentPRAction } from "@/lib/actions/workflows/createDependentPR"
import { toast } from "@/lib/hooks/use-toast"

interface Props {
  repoFullName: string
  pullNumber: number
  onStart: () => void
  onComplete: () => void
  onError: () => void
}

export default function CreateDependentPRController({
  repoFullName,
  pullNumber,
  onStart,
  onComplete,
  onError,
}: Props) {
  const execute = async () => {
    try {
      onStart()
      const result = await createDependentPRAction({
        repoFullName,
        pullNumber,
      })

      if (result.status !== "success") {
        throw new Error(
          result.message || "Failed to start dependent PR workflow"
        )
      }

      toast({
        title: "Dependent PR workflow started",
        description: "You can monitor progress in Workflow Runs.",
      })
      onComplete()
    } catch (error) {
      toast({
        title: "Dependent PR workflow failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      })
      onError()
      console.error("Create dependent PR failed: ", error)
    }
  }

  return { execute }
}
