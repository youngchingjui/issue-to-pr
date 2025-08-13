import { Loader2, NotebookPen } from "lucide-react"
import Link from "next/link"

import PRStatusIndicator from "@/components/issues/PRStatusIndicator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { IssueWithStatus } from "@/lib/github/issues"

interface Props {
  issue: Pick<
    IssueWithStatus,
    "hasActiveWorkflow" | "hasPlan" | "planId" | "number"
  >
  repoFullName: string
}

export default function StatusIndicators({ issue, repoFullName }: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-row gap-2">
        {/* Active Workflow Spinner Slot */}
        <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
          {issue.hasActiveWorkflow ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Loader2
                  className="inline align-text-bottom mr-0.5 animate-spin text-purple-600"
                  size={18}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom">Workflow running</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        {/* Plan Icon Slot */}
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
        {/* PR Icon Slot - lazily fetched on the client */}
        <PRStatusIndicator
          repoFullName={repoFullName}
          issueNumber={issue.number}
        />
      </div>
    </TooltipProvider>
  )
}
