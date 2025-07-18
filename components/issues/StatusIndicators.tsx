import { GitPullRequest, NotebookPen } from "lucide-react"
import Link from "next/link"

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
    "hasPlan" | "hasPR" | "planId" | "prNumber" | "number"
  >
  repoFullName: string
}

export default function StatusIndicators({ issue, repoFullName }: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-row gap-2">
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
        {/* PR Icon Slot */}
        <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
          {issue.hasPR && issue.prNumber ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`https://github.com/${repoFullName}/pull/${issue.prNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer"
                >
                  <GitPullRequest
                    className="inline align-text-bottom text-green-600"
                    size={18}
                  />
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom">PR ready</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>
    </TooltipProvider>
  )
}
