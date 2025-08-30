"use client"

import { formatDistanceToNow } from "date-fns"
import { ChevronDown, Loader2 } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import React from "react"

import AutoResolveIssueController from "@/components/issues/controllers/AutoResolveIssueController"
import CreatePRController from "@/components/issues/controllers/CreatePRController"
import GenerateResolutionPlanController from "@/components/issues/controllers/GenerateResolutionPlanController"
import StatusIndicators from "@/components/issues/StatusIndicators"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import type { IssueWithStatus } from "@/lib/github/issues"

interface IssueRowProps {
  issue: IssueWithStatus
  repoFullName: string
  prSlot?: React.ReactNode
}

type MainActionId = "autoResolve" | "plan" | "createPR"

export default function IssueRow({
  issue,
  repoFullName,
  prSlot,
}: IssueRowProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)
  const [mainAction, setMainAction] = useState<MainActionId>("autoResolve")

  const createPRController = CreatePRController({
    issueNumber: issue.number,
    repoFullName,
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

  const { execute: autoResolveIssue } = AutoResolveIssueController({
    issueNumber: issue.number,
    repoFullName,
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

  const { execute: generateResolutionPlan } = GenerateResolutionPlanController({
    issueNumber: issue.number,
    repoFullName,
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

  // Action map and derived label
  const actions = useMemo(
    () => ({
      autoResolve: {
        label: "Generate PR",
        execute: autoResolveIssue,
      },
      plan: {
        label: "Create Plan",
        execute: generateResolutionPlan,
      },
      createPR: {
        label: "Fix Issue and Create PR",
        execute: createPRController.execute,
      },
    }),
    [autoResolveIssue, generateResolutionPlan, createPRController.execute]
  )

  const mainLabel = actions[mainAction].label
  const runMain = actions[mainAction].execute

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
            onClick={runMain}
            className="rounded-r-none border-r-0 p-5"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {activeWorkflow}
              </>
            ) : (
              <>{mainLabel}</>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="rounded-l-none border-l-0 px-2 py-5"
                aria-label="Change main action"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px]">
              <DropdownMenuLabel>Choose main action</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={mainAction}
                onValueChange={(v) => setMainAction(v as MainActionId)}
              >
                <DropdownMenuRadioItem value="autoResolve">
                  Auto Resolve Issue
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="plan">
                  Generate Resolution Plan
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="createPR">
                  Fix Issue and Create PR
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}
