"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "@/lib/hooks/use-toast"

interface Props {
  planId: string
  issueNumber: number
  repoFullName: string
  createPR?: boolean
}

export function ResolveIssueButton({ planId, issueNumber, repoFullName, createPR = true }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const handleResolve = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          issueNumber,
          repoFullName,
          createPR,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Failed to launch resolveIssue workflow.")
      }
      toast({
        title: "Workflow Launched",
        description: `Successfully launched resolveIssue workflow for Plan ID ${planId}. Job ID: ${result.jobId}`,
      })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      toast({
        title: "Failed to Launch Workflow",
        description: error,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResolve}
            className="ml-2"
            disabled={isLoading}
            aria-label="Launch resolveIssue workflow"
          >
            {isLoading ? "Launching..." : "Create PR from Plan"}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span>
            Launch resolveIssue workflow using the selected plan. This executes your implementation plan.
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

