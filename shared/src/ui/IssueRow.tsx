"use client"

import { formatDistanceToNow } from "date-fns"
import { ChevronDown, Loader2 } from "lucide-react"
import Link from "next/link"
import React, { useMemo, useState } from "react"

// NOTE: This shared UI version intentionally avoids importing app-specific controllers.
// It exposes callbacks so apps (Next.js, Storybook) can plug in their own behaviors.

export interface SharedIssueUser {
  login?: string
}

export interface SharedIssue {
  number: number
  title: string
  state: string
  updated_at: string
  user?: SharedIssueUser
  hasActiveWorkflow?: boolean
  hasPlan?: boolean
  planId?: string
}

export type MainActionId = "autoResolve" | "plan" | "createPR"

export interface IssueRowProps {
  issue: SharedIssue
  repoFullName: string
  prSlot?: React.ReactNode
  onAutoResolve?: () => Promise<void> | void
  onGeneratePlan?: () => Promise<void> | void
  onCreatePR?: () => Promise<void> | void
}

export function IssueRow({
  issue,
  repoFullName,
  prSlot,
  onAutoResolve,
  onGeneratePlan,
  onCreatePR,
}: IssueRowProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)
  const [mainAction, setMainAction] = useState<MainActionId>("autoResolve")

  const runWithUi = async (label: string, fn?: () => Promise<void> | void) => {
    if (!fn) return
    try {
      setIsLoading(true)
      setActiveWorkflow("Launching agent...")
      await fn()
    } finally {
      setIsLoading(false)
      setActiveWorkflow(null)
    }
  }

  const actions = useMemo(
    () => ({
      autoResolve: {
        label: "Generate PR",
        execute: () => runWithUi("Generate PR", onAutoResolve),
      },
      plan: {
        label: "Create Plan",
        execute: () => runWithUi("Create Plan", onGeneratePlan),
      },
      createPR: {
        label: "Fix Issue and Create PR",
        execute: () => runWithUi("Fix Issue and Create PR", onCreatePR),
      },
    }),
    [onAutoResolve, onGeneratePlan, onCreatePR]
  )

  const mainLabel = actions[mainAction].label
  const runMain = actions[mainAction].execute

  const [username, repo] = repoFullName.split("/")
  const localIssueUrl = `/${username}/${repo}/issues/${issue.number}`

  return (
    <tr className="sm:table-row flex flex-col sm:flex-row w-full">
      <td className="py-4 flex-1">
        <div className="flex flex-col gap-1">
          <div className="font-medium text-base break-words">
            <Link href={localIssueUrl} className="hover:underline">
              {issue.title}
            </Link>
          </div>
          <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
            <span>#{issue.number}</span>
            {issue.user?.login ? (
              <>
                <span>•</span>
                <span>{issue.user.login}</span>
              </>
            ) : null}
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
      </td>
      <td className="text-center align-middle w-full sm:w-12 mb-2 sm:mb-0">
        {/* Consumers can pass any PR indicator via prSlot */}
        {prSlot}
      </td>
      <td className="text-right">
        <div className="inline-flex w-full sm:w-auto">
          <button
            disabled={isLoading}
            onClick={runMain}
            className="rounded-r-none border-r-0 p-2 border inline-flex items-center gap-2 text-sm"
            aria-label={mainLabel}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                {activeWorkflow}
              </>
            ) : (
              <>{mainLabel}</>
            )}
          </button>
          <div className="relative">
            <button
              disabled={isLoading}
              className="rounded-l-none border-l-0 px-2 py-2 border"
              aria-label="Change main action"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            {/* Simple dropdown placeholder for shared version; consumers can wrap with their own menu */}
          </div>
        </div>
      </td>
    </tr>
  )
}

export default IssueRow
