"use client"

import { formatDistanceToNow } from "date-fns"
import { ChevronDown, Loader2, PlayCircle } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import AlignmentCheckController from "@/components/pull-requests/controllers/AlignmentCheckController"
import AnalyzePRController from "@/components/pull-requests/controllers/AnalyzePRController"
import ReviewPRController from "@/components/pull-requests/controllers/ReviewPRController"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import { PullRequest } from "@/lib/types/github"

export default function PullRequestRow({ pr }: { pr: PullRequest }) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)

  const analyzeWorkflow = AnalyzePRController({
    repoFullName: pr.head.repo.full_name,
    pullNumber: pr.number,
    onStart: () => {
      setIsLoading(true)
      setActiveWorkflow("Analyzing...")
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

  const reviewWorkflow = ReviewPRController({
    repoFullName: pr.head.repo.full_name,
    pullNumber: pr.number,
    onStart: () => {
      setIsLoading(true)
      setActiveWorkflow("Reviewing...")
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

  const alignmentCheckWorkflow = AlignmentCheckController({
    repoFullName: pr.head.repo.full_name,
    pullNumber: pr.number,
    onStart: () => {
      setIsLoading(true)
      setActiveWorkflow("Running AlignmentCheck...")
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
    <TableRow>
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
            {pr.user?.login && (
              <>
                <span>•</span>
                <span>{pr.user.login}</span>
              </>
            )}
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
      {/* Optionally add a cell for PR status indicators here if needed in future */}
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {activeWorkflow}
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Launch Workflow
                  <ChevronDown className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px]">
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
            <DropdownMenuItem onClick={alignmentCheckWorkflow.execute}>
              <div>
                <div>Run AlignmentCheck</div>
                <div className="text-xs text-muted-foreground">
                  Check how well this PR aligns with requirements and goals
                </div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
