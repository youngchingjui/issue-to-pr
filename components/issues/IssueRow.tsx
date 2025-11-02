"use client"

import { formatDistanceToNow } from "date-fns"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import React, { useState } from "react"

import { useBranchContext } from "@/components/common/BranchContext"
import AutoResolveIssueController from "@/components/issues/controllers/AutoResolveIssueController"
import StatusIndicators from "@/components/issues/StatusIndicators"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"

interface Issue {
  id: number
  number: number
  title: string
  state: string
  updated_at: string
  user: { login: string } | null
  hasActiveWorkflow: boolean
  hasPlan: boolean
  planId?: string | null | undefined
}

interface IssueRowProps {
  issue: Issue
  repoFullName: string
  prSlot?: React.ReactNode
}

export default function IssueRow({
  issue,
  repoFullName,
  prSlot,
}: IssueRowProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)

  const branchContext = useBranchContext()

  const { execute: autoResolveIssue } = AutoResolveIssueController({
    issueNumber: issue.number,
    repoFullName,
    branch: branchContext?.branch?.trim() || undefined,
    onStart: () => {
      setIsLoading(true)
      setActiveWorkflow("Launching agent...")
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

  // Extract username and repo from repoFullName
  const [username, repo] = repoFullName.split("/")
  const localIssueUrl = `/${username}/${repo}/issues/${issue.number}`

  return (
    <TableRow className="sm:table-row flex flex-col sm:flex-row w-full">
      <TableCell className="py-4 flex-1">
        <div className="flex flex-col gap-1">
          <div className="font-medium text-base break-words">
            <Link href={localIssueUrl} className="hover:underline">
              {issue.title}
            </Link>
          </div>
          <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
            <span>#{issue.number}</span>
            {issue.user?.login && (
              <>
                <span>•</span>
                <span>{issue.user.login}</span>
              </>
            )}
            <span>•</span>
            <span>{issue.state}</span>
            <span>•</span>
            <span>
              Updated{" "}
              {formatDistanceToNow(new Date(issue.updated_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center align-middle w-full sm:w-12 mb-2 sm:mb-0">
        <StatusIndicators
          issue={issue}
          repoFullName={repoFullName}
          prSlot={prSlot}
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="inline-flex w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={autoResolveIssue}
            className="p-5"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span aria-live="polite">{activeWorkflow}</span>
              </>
            ) : (
              <>Resolve Issue</>
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
