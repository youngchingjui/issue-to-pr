"use client"

import { HelpCircle } from "lucide-react"
import { useState } from "react"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "@/lib/hooks/use-toast"
import { CommentRequestSchema } from "@/lib/schemas/api"
import { SSEUtils } from "@/lib/utils/utils-common"

interface Props {
  issueNumber: number
  repoFullName: string
  onStart: () => void
  onComplete: () => void
  onError: () => void
}

export default function GenerateResolutionPlanController({
  issueNumber,
  repoFullName,
  onStart,
  onComplete,
  onError,
}: Props) {
  const [postToGithub, setPostToGithub] = useState(false)

  const execute = async () => {
    try {
      onStart()
      const requestBody = CommentRequestSchema.parse({
        issueNumber,
        repoFullName,
        postToGithub,
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

      const { jobId } = await response.json()
      const eventSource = new EventSource(`/api/sse?jobId=${jobId}`)

      let completed = false
      const timeoutId = setTimeout(() => {
        if (!completed) {
          eventSource.close()
          onComplete()
        }
      }, 5000)

      eventSource.onmessage = (event) => {
        const status = SSEUtils.decodeStatus(event.data)

        if (
          status === "Stream finished" ||
          status.startsWith("Completed") ||
          status.startsWith("Failed")
        ) {
          completed = true
          clearTimeout(timeoutId)
          eventSource.close()
          onComplete()
        }
      }

      eventSource.onerror = (event) => {
        console.error("SSE connection failed:", event)
        completed = true
        clearTimeout(timeoutId)
        eventSource.close()
        onError()
      }

      toast({
        title: "Resolution Plan Generation Started",
        description: "Analyzing the issue and generating a plan...",
      })
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

  return {
    execute,
    ToggleControl: () => (
      <div className="flex items-center gap-3">
        <Switch
          id="post-to-github"
          checked={postToGithub}
          onCheckedChange={setPostToGithub}
          className="data-[state=checked]:bg-primary"
        />
        <div className="flex items-center gap-2">
          <Label
            htmlFor="post-to-github"
            className="text-sm text-muted-foreground"
          >
            Post to GitHub
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground/70 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px]">
                <p>
                  When enabled, the workflow will automatically post the
                  generated plan as a comment on the GitHub issue. When
                  disabled, the plan will only be shown here.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    ),
  }
}
