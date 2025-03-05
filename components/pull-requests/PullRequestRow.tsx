"use client"

import { formatDistanceToNow } from "date-fns"
import { ChevronDown, Loader2, PlayCircle } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import AnalyzePRWorkflow from "@/components/pull-requests/workflows/AnalyzePRWorkflow"
import ReviewPRWorkflow from "@/components/pull-requests/workflows/ReviewPRWorkflow"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import { PullRequest } from "@/lib/types"

export default function PullRequestRow({ pr }: { pr: PullRequest }) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)

  const analyzeWorkflow = AnalyzePRWorkflow({
    repoFullName: pr.head.repo.full_name,
    pullNumber: pr.number,
    onStart: () => {
      setIsLoading(true)
      setActiveWorkflow("analyze")
    },
    onComplete: () => {
      setIsLoading(false)
      setActiveWorkflow(null)
    },
    onError: () => {
      setIsLoading(false)
      setActiveWorkflow(null)
    },
  })

  const reviewWorkflow = ReviewPRWorkflow({
    repoFullName: pr.head.repo.full_name,
    pullNumber: pr.number,
    onStart: () => {
      setIsLoading(true)
      setActiveWorkflow("review")
    },
    onComplete: () => {
      setIsLoading(false)
      setActiveWorkflow(null)
    },
    onError: () => {
      setIsLoading(false)
      setActiveWorkflow(null)
    },
  })

  return (
    <TableRow key={pr.id}>
      <TableCell className="py-4">
        <div className="flex flex-col gap-1">
          <div className="font-medium text-base">
            <Link
              href={`https://github.com/${pr.head.repo.full_name}/pull/${pr.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {pr.title}
            </Link>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span>#{pr.number}</span>
            <span>•</span>
            <span>{pr.user.login}</span>
            <span>•</span>
            <span>{pr.state}</span>
            <span>•</span>
            <span>
              Updated{" "}
              {formatDistanceToNow(new Date(pr.updated_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {activeWorkflow === "analyze"
                    ? "Analyzing..."
                    : "Reviewing..."}
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Run Workflow
                  <ChevronDown className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem onClick={reviewWorkflow.execute}>
              <div>
                <div>Review Pull Request</div>
                <div className="text-xs text-muted-foreground">
                  Get an AI-powered review of the changes
                </div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={analyzeWorkflow.execute}>
              <div>
                <div>Analyze PR Goals</div>
                <div className="text-xs text-muted-foreground">
                  Analyze the goals and requirements
                </div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
