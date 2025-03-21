"use client"

import { toast } from "@/hooks/use-toast"
import { CommentRequestSchema } from "@/lib/schemas/api"
import { getApiKeyFromLocalStorage } from "@/lib/utils/utils-common"

interface Props {
  issueNumber: number
  repoFullName: string
  onStart: () => void
  onComplete: () => void
  onError: () => void
  onWorkflowId: (workflowId: string) => void
}

export default function GenerateResolutionPlanController({
  issueNumber,
  repoFullName,
  onStart,
  onComplete,
  onError,
  onWorkflowId,
}: Props) {
  const execute = async () => {
    try {
      const apiKey = getApiKeyFromLocalStorage()
      if (!apiKey) {
        toast({
          title: "API key not found",
          description: "Please save an OpenAI API key first.",
          variant: "destructive",
        })
        return
      }

      onStart()
      const requestBody = CommentRequestSchema.parse({
        issueNumber,
        repoFullName,
        apiKey,
      })
      const response = await fetch("/api/comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error("Failed to start resolution plan generation")
      }

      const { workflowId } = await response.json()
      onWorkflowId(workflowId)

      toast({
        title: "Resolution Plan Generation Started",
        description: "Analyzing the issue and generating a plan...",
      })

      return workflowId
    } catch (error) {
      toast({
        title: "Resolution Plan Generation Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      })
      onError()
      console.error("Resolution plan generation failed:", error)
    }
  }

  return { execute }
}
