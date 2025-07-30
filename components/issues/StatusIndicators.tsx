import { GitPullRequest, Loader2, NotebookPen } from "lucide-react"
import Link from "next/link"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { IssueWithStatus } from "@/lib/github/issues"
import type { PullRequestBrief } from "@/lib/github/pullRequests"

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

/**
 * Maps PR status to Tailwind colour classes
 */
function getColorClass(pr: PullRequestBrief): string {
  if (pr.isDraft) return "text-gray-500"
  switch (pr.state) {
    case "MERGED":
      return "text-purple-600"
    case "CLOSED":
      return "text-red-600"
    case "OPEN":
    default:
      return "text-green-600"
  }
}

export default function StatusIndicators({ issue, repoFullName }: Props) {
  const prs = issue.pullRequests ?? []
  const maxIcons = 3 // only show at most 3 icons to avoid clutter
  // Take latest PRs (highest numbers) and reverse so latest on top (rendered last)
  const displayedPRs = [...prs]
    .sort((a, b) => b.number - a.number)
    .slice(0, maxIcons)
    .reverse()

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
          style={{ width: 24, display: "flex", justifyContent: "center" }}
          className="relative"
        >
          {displayedPRs.map((pr, idx) => (
            <Tooltip key={pr.number}>
              <TooltipTrigger asChild>
                <a
                  href={`https://github.com/${repoFullName}/pull/${pr.number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`cursor-pointer absolute`}
                  style={{ left: idx * 6, zIndex: idx }}
                >
                  <GitPullRequest
                    className={`inline align-text-bottom ${getColorClass(pr)}`}
                    size={18}
                  />
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                PR #{pr.number} - {pr.isDraft ? "Draft" : pr.state.toLowerCase()}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}

