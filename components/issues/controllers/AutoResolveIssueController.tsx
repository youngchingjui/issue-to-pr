"use client"

import {
  type EnqueueJobsRequest,
  enqueueJobsResponseSchema,
} from "@/app/api/queues/[queueId]/jobs/schemas"
import { toast } from "@/lib/hooks/use-toast"
import { WORKFLOW_JOBS_QUEUE } from "@/shared/entities/Queue"

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
      const queueName = WORKFLOW_JOBS_QUEUE
      const job: EnqueueJobsRequest = {
        name: "autoResolveIssue",
        data: {
          repoFullName,
          issueNumber,
          branch,
        },
      }
      // TODO: Switch to server action, since this is a POST request
      // TODO: `queueId` is not appropriately named. It should just be called `queueName` or something similar
      const res = await fetch(`/api/queues/${queueName}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      })
      const { success, data, error } = enqueueJobsResponseSchema.safeParse(
        await res.json()
      )
      if (!success) {
        toast({
          title: "Failed to enqueue job",
          description: error.message || "Failed to enqueue job",
          variant: "destructive",
        })
        onError()
        return
      }

      toast({
        title: "Workflow Started",
        description: `Auto resolve issue workflow launched, workflow ID: ${data.jobId}`,
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
