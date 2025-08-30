"use client"

import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, ChevronDown, GitMerge, Loader2, PlayCircle } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import AlignmentCheckController from "@/components/pull-requests/controllers/AlignmentCheckController"
import AnalyzePRController from "@/components/pull-requests/controllers/AnalyzePRController"
import ResolveMergeConflictsController from "@/components/pull-requests/controllers/ResolveMergeConflictsController"
import ReviewPRController from "@/components/pull-requests/controllers/ReviewPRController"
import { Badge } from "@/components/ui/badge"
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
  const [mergeableState, setMergeableState] = useState<string | null>(null)

  useEffect(() => {
    // Fetch mergeability for this PR (list API doesn't include it)
    const fetchMergeable = async () => {
      try {
        const res = await fetch("/api/github/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "pull", number: pr.number, fullName: pr.head.repo.full_name }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data && typeof data.mergeable_state === "string") {
            setMergeableState(data.mergeable_state)
          }
        }
      } catch (e) {
        // Ignore silently for badge; table remains usable
      }
    }
    fetchMergeable()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const resolveMergeConflictsWorkflow = ResolveMergeConflictsController({
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

  const hasConflict = mergeableState === "dirty"

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
            {hasConflict ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle size={14} /> Conflict
              </Badge>
            ) : null}
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
            <DropdownMenuItem onClick={resolveMergeConflictsWorkflow.execute} disabled={!hasConflict}>
              <div className="flex items-start gap-2">
                <GitMerge className="mt-0.5 h-4 w-4" />
                <div>
                  <div>{hasConflict ? "Resolve Merge Conflicts" : "No Conflicts Detected"}</div>
                  <div className="text-xs text-muted-foreground">
                    {hasConflict
                      ? "Gather context and attempt to auto-resolve conflicts"
                      : "This PR currently has no reported conflicts with base"}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

