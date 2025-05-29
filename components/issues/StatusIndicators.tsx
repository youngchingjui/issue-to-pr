import { GitPullRequest, NotebookPen } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { IssueWithStatus } from "@/lib/github/issues"

interface Props {
  issue: Pick<IssueWithStatus, "hasPlan" | "hasPR">
}

export default function StatusIndicators({ issue }: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-row gap-2">
        {/* Plan Icon Slot */}
        <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
          {issue.hasPlan ? (
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
      </div>
    </TooltipProvider>
  )
}
