import { Loader2, NotebookPen } from "lucide-react"
import Link from "next/link"
import React from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Issue {
  hasActiveWorkflow: boolean
  activeWorkflowId?: string | null
  hasPlan: boolean
  planId?: string | null | undefined
  number: number
}
interface Props {
  issue: Issue
  repoFullName: string
  prSlot?: React.ReactNode
}

export default function StatusIndicators({
  issue,
  repoFullName,
  prSlot,
}: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-row gap-2">
        <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
          {issue.hasActiveWorkflow ? (
            <Tooltip>
              <TooltipTrigger asChild>
                {issue.activeWorkflowId ? (
                  <Link
                    href={`/workflow-runs/${issue.activeWorkflowId}`}
                    className="cursor-pointer"
                  >
                    <Loader2
                      className="inline align-text-bottom mr-0.5 animate-spin text-purple-600"
                      size={18}
                    />
                  </Link>
                ) : (
                  <Loader2
                    className="inline align-text-bottom mr-0.5 animate-spin text-purple-600"
                    size={18}
                  />
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom">Workflow running</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
          {issue.hasPlan && issue.planId ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={`/${repoFullName}/issues/${issue.number}/plan/${issue.planId}`}
                  className="cursor-pointer"
                >
                  <NotebookPen
                    className="inline align-text-bottom mr-0.5 text-blue-600"
                    size={18}
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">Plan ready</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        {prSlot}
      </div>
    </TooltipProvider>
  )
}

