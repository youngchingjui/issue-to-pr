import { GitPullRequest, Loader2, NotebookPen } from "lucide-react"
import Link from "next/link"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { IssueWithStatus } from "@/lib/github/issues"

/**
 * Utility: map PR status to icon color class
 */
function prColor({ state, isDraft }: { state: string; isDraft: boolean }): string {
  if (isDraft) return "text-gray-400"
  switch (state) {
    case "MERGED":
      return "text-purple-600"
    case "CLOSED":
      return "text-red-600"
    case "OPEN":
    default:
      return "text-green-600"
  }
}

interface Props {
  issue: Pick<
    IssueWithStatus,
    | "hasActiveWorkflow"
    | "hasPlan"
    | "hasPR"
    | "planId"
    | "number"
    | "pullRequests"
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
        {/* PR Icons Slot */}
        <div
          style={{ width: 24, position: "relative" }}
          className="flex justify-center"
        >
          {issue.hasPR && issue.pullRequests && issue.pullRequests.length > 0 ? (
            <>
              {issue.pullRequests.slice(0, 3).map((pr, idx) => (
                <Tooltip key={pr.number}>
                  <TooltipTrigger asChild>
                    <a
                      href={`https://github.com/${repoFullName}/pull/${pr.number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer"
                      style={{
                        position: "absolute",
                        left: idx * 6, // Slight horizontal offset for stacking
                        zIndex: 10 - idx,
                      }}
                    >
                      <GitPullRequest
                        className={`inline align-text-bottom ${prColor(pr)}`}
                        size={18}
                      />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    PR #{pr.number} ({pr.isDraft ? "Draft" : pr.state})
                  </TooltipContent>
                </Tooltip>
              ))}
            </>
          ) : null}
        </div>
      </div>
    </TooltipProvider>
  )
}

