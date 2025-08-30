"use client"

import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, ChevronDown, Loader2, PlayCircle } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AlignmentCheckController from "@/components/pull-requests/controllers/AlignmentCheckController"
import AnalyzePRController from "@/components/pull-requests/controllers/AnalyzePRController"
import ResolveMergeConflictsController from "@/components/pull-requests/controllers/ResolveMergeConflictsController"
import ReviewPRController from "@/components/pull-requests/controllers/ReviewPRController"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PullRequest } from "@/lib/types/github"

export default function PullRequestRow({ pr }: { pr: PullRequest }) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)
  const [mergeableState, setMergeableState] = useState<string | null>(null)

  // lazily fetch PR details to get mergeable_state
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/github/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "pull", number: pr.number, fullName: pr.head.repo.full_name }),
        })
        if (!res.ok) return
        const data = await res.json()
        if (mounted && data && typeof data.mergeable_state === "string") {
          setMergeableState(data.mergeable_state)
        }
      } catch (e) {
        // ignore
      }
    })()
    return () => {
      mounted = false
    }
  }, [pr.number, pr.head.repo.full_name])

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

  const hasConflicts = useMemo(() => mergeableState === "dirty", [mergeableState])

  return (
    <TableRow>
      <TableCell className="py-4">
        <div className="flex flex-col gap-1">
          <div className="font-medium text-base flex items-center gap-2">
            <Link
              href={`https://github.com/${pr.head.repo.full_name}/pull/${pr.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {pr.title}
            </Link>
            {hasConflicts && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Merge conflicts
              </Badge>
            )}
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
          <DropdownMenuContent align="end" className="w-[260px]">
            {hasConflicts && (
              <DropdownMenuItem onClick={resolveConflictsWorkflow.execute}>
                <div>
                  <div>Resolve Merge Conflicts</div>
                  <div className="text-xs text-muted-foreground">
                    Analyze PR and auto-resolve conflicts on {pr.head.ref}
                  </div>
                </div>
              </DropdownMenuItem>
            )}
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

