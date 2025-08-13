import { GitPullRequest } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Props {
  repoFullName: string
  prNumber: number | null | undefined
}

export default function PRStatusIndicator({ repoFullName, prNumber }: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
        {prNumber ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={`https://github.com/${repoFullName}/pull/${prNumber}`}
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
    </TooltipProvider>
  )
}
