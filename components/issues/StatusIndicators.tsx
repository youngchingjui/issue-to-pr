import { GitPullRequest, NotebookPen, GitMerge } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { IssueWithStatus } from "@/lib/github/issues"

interface Props {
  issue: IssueWithStatus
}

// Custom slow-pulse animation class (Tailwind)
const slowPulse = "animate-[pulse_2.5s_ease-in-out_infinite]"

export default function StatusIndicators({ issue }: Props) {
  // Detect running workflows by type
  const activePlan = issue.activeWorkflows?.some((w) => w.type === "commentOnIssue")
  const activeResolve = issue.activeWorkflows?.some((w) => w.type === "resolveIssue")

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-row gap-2">
        {/* Plan Icon Slot (has plan or running plan workflow) */}
        <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
          {activePlan ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-pointer">
                  <NotebookPen
                    className={"inline align-text-bottom mr-0.5 text-blue-600 " + slowPulse}
                    size={18}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">Plan workflow running</TooltipContent>
            </Tooltip>
          ) : issue.hasPlan ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-pointer">
                  <NotebookPen
                    className="inline align-text-bottom mr-0.5 text-blue-600"
                    size={18}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">Plan ready</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        {/* PR Icon Slot */}
        <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
          {issue.hasPR ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-pointer">
                  <GitPullRequest
                    className="inline align-text-bottom text-green-600"
                    size={18}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">PR ready</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        {/* Git Merge icon for resolveIssue workflow running */}
        <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
          {activeResolve ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-pointer">
                  <GitMerge
                    className={"inline align-text-bottom text-violet-600 " + slowPulse}
                    size={18}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">Resolve Issue workflow running</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>
    </TooltipProvider>
  )
}
