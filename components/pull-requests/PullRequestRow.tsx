"use client"

import { formatDistanceToNow } from "date-fns"
import {
  ChevronDown,
  Loader2,
  MessageSquare,
  MessageSquareText,
  PlayCircle,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AlignmentCheckController from "@/components/pull-requests/controllers/AlignmentCheckController"
import AnalyzePRController from "@/components/pull-requests/controllers/AnalyzePRController"
import CreateDependentPRController from "@/components/pull-requests/controllers/CreateDependentPRController"
import ResolveMergeConflictsController from "@/components/pull-requests/controllers/ResolveMergeConflictsController"
import ReviewPRController from "@/components/pull-requests/controllers/ReviewPRController"
import UpdateBranchController from "@/components/pull-requests/controllers/UpdateBranchController"
import MergeConflictBadge from "@/components/pull-requests/MergeConflictBadge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PullRequest, PullRequestSingle } from "@/lib/types/github"

export default function PullRequestRow({ pr }: { pr: PullRequest }) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)
  const [prDetails, setPrDetails] = useState<PullRequestSingle | null>(null)
  const [tooltipOpen, setTooltipOpen] = useState<{
    comments: boolean
    reviewComments: boolean
  }>({
    comments: false,
    reviewComments: false,
  })

  useEffect(() => {
    let isMounted = true
    async function fetchDetails() {
      try {
        const res = await fetch("/api/github/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "pull",
            number: pr.number,
            fullName: pr.head.repo.full_name,
          }),
        })
        if (!res.ok) return
        const data = await res.json()
        if (isMounted) setPrDetails(data)
      } catch {
        // ignore
      }
    }
    fetchDetails()
    return () => {
      isMounted = false
    }
  }, [pr.number, pr.head.repo.full_name])

  const commentsCount = prDetails?.comments ?? 0
  const reviewCommentsCount = prDetails?.review_comments ?? 0

  const hasCommentsOrReviews = commentsCount > 0 || reviewCommentsCount > 0

  const hasConflicts = useMemo(() => {
    const mergeable: boolean | null | undefined = prDetails?.mergeable
    const mergeableState: string | undefined = prDetails?.mergeable_state
    if (mergeable === false) return true
    return mergeableState === "dirty"
  }, [prDetails])

  const canUpdateBranch = useMemo(() => {
    const state = prDetails?.mergeable_state
    return state === "behind"
  }, [prDetails])

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

  const updateBranchWorkflow = UpdateBranchController({
    repoFullName: pr.head.repo.full_name,
    pullNumber: pr.number,
    expectedHeadSha: pr.head.sha,
    onStart: () => {
      setIsLoading(true)
      setActiveWorkflow("Updating branch...")
    },
    onComplete: async () => {
      setIsLoading(false)
      setActiveWorkflow(null)
      // refresh mergeability details
      try {
        const res = await fetch("/api/github/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "pull",
            number: pr.number,
            fullName: pr.head.repo.full_name,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setPrDetails(data)
        }
      } catch {
        // ignore
      }
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

  const showTooltipOnClick = (key: "comments" | "reviewComments") => {
    setTooltipOpen((prev) => ({ ...prev, [key]: true }))
    // auto-close after a short delay
    setTimeout(() => {
      setTooltipOpen((prev) => ({ ...prev, [key]: false }))
    }, 1500)
  }

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
          <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
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
            {/* Info icons */}
            <TooltipProvider>
              <Tooltip
                open={tooltipOpen.comments}
                onOpenChange={(o) =>
                  setTooltipOpen((p) => ({ ...p, comments: o }))
                }
              >
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    aria-label={`Comments (${commentsCount})`}
                    onClick={() => showTooltipOnClick("comments")}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-xs">{commentsCount}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Comments</TooltipContent>
              </Tooltip>
              <Tooltip
                open={tooltipOpen.reviewComments}
                onOpenChange={(o) =>
                  setTooltipOpen((p) => ({ ...p, reviewComments: o }))
                }
              >
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    aria-label={`Review comments (${reviewCommentsCount})`}
                    onClick={() => showTooltipOnClick("reviewComments")}
                  >
                    <MessageSquareText className="h-4 w-4" />
                    <span className="text-xs">{reviewCommentsCount}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Review comments</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {canUpdateBranch && (
            <Button
              variant="secondary"
              size="sm"
              onClick={updateBranchWorkflow.execute}
              disabled={isLoading}
            >
              {activeWorkflow === "Updating branch..."
                ? "Updating..."
                : "Update branch"}
            </Button>
          )}
          {hasConflicts && (
            <Button
              variant="secondary"
              size="sm"
              onClick={resolveConflictsWorkflow.execute}
              disabled={isLoading}
            >
              {activeWorkflow === "Resolving conflicts..."
                ? "Resolving..."
                : "Auto resolve conflicts"}
            </Button>
          )}
          {hasCommentsOrReviews && (
            <Button
              variant="secondary"
              size="sm"
              onClick={createDependentPRWorkflow.execute}
              disabled={isLoading}
            >
              {activeWorkflow === "Creating dependent PR..."
                ? "Starting..."
                : "Address comments with new PR"}
            </Button>
          )}
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
            <DropdownMenuContent align="end" className="w-[240px]">
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}
