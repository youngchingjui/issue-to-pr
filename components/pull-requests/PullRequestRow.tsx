"use client"

import { formatDistanceToNow } from "date-fns"
import { ChevronDown, ExternalLink, Loader2, PlayCircle } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import AlignmentCheckController from "@/components/pull-requests/controllers/AlignmentCheckController"
import AnalyzePRController from "@/components/pull-requests/controllers/AnalyzePRController"
import CreateDependentPRController from "@/components/pull-requests/controllers/CreateDependentPRController"
import ResolveMergeConflictsController from "@/components/pull-requests/controllers/ResolveMergeConflictsController"
import ReviewPRController from "@/components/pull-requests/controllers/ReviewPRController"
import MergeConflictBadge from "@/components/pull-requests/MergeConflictBadge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import { PullRequest } from "@/lib/types/github"

export default function PullRequestRow({
  pr,
  previewUrl,
  linkedIssues = [],
}: {
  pr: PullRequest
  previewUrl?: string
  linkedIssues?: number[]
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)
  const [closingIssue, setClosingIssue] = useState(false)

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

  const resolveConflictsWorkflow = ResolveMergeConflictsController({
    repoFullName: pr.head.repo.full_name,
    pullNumber: pr.number,
    onStart: () => {
      setIsLoading(true)
      setActiveWorkflow("Resolving conflicts...")
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

  const createDependentPRWorkflow = CreateDependentPRController({
    repoFullName: pr.head.repo.full_name,
    pullNumber: pr.number,
    onStart: () => {
      setIsLoading(true)
      setActiveWorkflow("Creating dependent PR...")
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

  const handleCloseLinkedIssue = async () => {
    const issueNumber = linkedIssues[0]
    if (!issueNumber) return
    try {
      setClosingIssue(true)
      await fetch(`/api/issues/${issueNumber}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoFullName: pr.head.repo.full_name }),
        }
      )
    } catch {
      // no-op
    } finally {
      setClosingIssue(false)
    }
  }

  const prUrl = `https://github.com/${pr.head.repo.full_name}/pull/${pr.number}`

  return (
    <TableRow>
      <TableCell className="py-4">
        <div className="flex flex-col gap-1">
          <div className="font-medium text-base">
            <Link
              href={prUrl}
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
            <MergeConflictBadge
              repoFullName={pr.head.repo.full_name}
              pullNumber={pr.number}
            />
          </div>
        </div>
      </TableCell>
      {/* Actions */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button asChild size="sm" disabled={isLoading}>
            <a
              href={previewUrl ?? prUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {previewUrl ? "View Preview" : "View PR"}
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>

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
                    Actions
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[260px]">
              <DropdownMenuItem asChild>
                <a href={prUrl} target="_blank" rel="noopener noreferrer">
                  View PR
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
              <DropdownMenuItem onClick={resolveConflictsWorkflow.execute}>
                <div>
                  <div>Resolve Merge Conflicts</div>
                  <div className="text-xs text-muted-foreground">
                    Detect and attempt to automatically resolve conflicts
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={createDependentPRWorkflow.execute}>
                <div>
                  <div>Create Dependent PR</div>
                  <div className="text-xs text-muted-foreground">
                    Create a follow-up PR targeting this PR&apos;s branch.
                  </div>
                </div>
              </DropdownMenuItem>
              {linkedIssues.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleCloseLinkedIssue} disabled={closingIssue}>
                    {closingIssue ? "Closing linked issue..." : "Close linked issue"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}

