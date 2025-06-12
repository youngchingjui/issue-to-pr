"use client"

import { HelpCircle } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "@/lib/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { ResolveRequestSchema } from "@/lib/schemas/api"
import { getApiKeyFromLocalStorage } from "@/lib/utils/utils-common"

interface Props {
  issueNumber: number
  repoFullName: string
  onStart: () => void
  onComplete: () => void
  onError: () => void
}

export default function CreatePRController({
  issueNumber,
  repoFullName,
  onStart,
  onComplete,
  onError,
}: Props) {
  const [postToGithub, setPostToGithub] = useState(false)
  const router = useRouter()

  const execute = async () => {
    try {
      const apiKey = getApiKeyFromLocalStorage()
      if (!apiKey) {
        toast({
          title: "API key not found",
          description: "Please save an OpenAI API key first.",
          variant: "destructive",
          action: (
            <ToastAction altText="Go to Settings" onClick={() => router.push('/settings')}>Go to Settings</ToastAction>
          ),
        })
        return
      }

      onStart()
      const requestBody = ResolveRequestSchema.parse({
        issueNumber,
        repoFullName,
        apiKey,
        createPR: postToGithub,
      })
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create pull request")
      }

      toast({
        title: "Pull Request Creation Started",
        description: "The issue is being analyzed and a PR will be created.",
      })

      onComplete()
      // Refresh the page after successful completion
      window.location.reload()
    } catch (error) {
      toast({
        title: "Pull Request Creation Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      })
      onError()
      console.error("PR creation failed: ", error)
    }
  }

  return {
    execute,
    ToggleControl: () => (
      <div className="flex items-center gap-3">
        <Switch
          id="post-pr-to-github"
          checked={postToGithub}
          onCheckedChange={setPostToGithub}
          className="data-[state=checked]:bg-primary"
        />
        <div className="flex items-center gap-2">
          <Label
            htmlFor="post-pr-to-github"
            className="text-sm text-muted-foreground"
          >
            Create PR
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground/70 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px]">
                <p>
                  When enabled, the workflow will automatically create a pull
                  request on GitHub with the proposed changes. When disabled,
                  you&apos;ll be able to review the changes before they&apos;re
                  published.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    ),
  }
}
