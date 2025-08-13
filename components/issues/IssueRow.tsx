"use client"

import { formatDistanceToNow } from "date-fns"
import { ChevronDown, Loader2, PlayCircle } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import React from "react"

import AutoResolveIssueController from "@/components/issues/controllers/AutoResolveIssueController"
import CreatePRController from "@/components/issues/controllers/CreatePRController"
import GenerateResolutionPlanController from "@/components/issues/controllers/GenerateResolutionPlanController"
import StatusIndicators from "@/components/issues/StatusIndicators"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import type { IssueWithStatus } from "@/lib/github/issues"

interface IssueRowProps {
  issue: IssueWithStatus
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

  const createPRController = CreatePRController({
    issueNumber: issue.number,
    repoFullName,
    onStart: () => {
      setIsLoading(true)
      setActiveWorkflow("Creating PR...")
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
      setActiveWorkflow("Auto Resolving...")
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
      setActiveWorkflow("Generating Plan...")
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isLoading}
              className="w-full sm:w-auto justify-between sm:justify-start"
            >
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
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem onClick={generateResolutionPlan}>
              <div>
                <div>Generate Resolution Plan</div>
                <div className="text-xs text-muted-foreground">
                  Get an AI-powered plan to resolve this issue
                </div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={createPRController.execute}>
              <div>
                <div>Fix Issue and Create PR</div>
                <div className="text-xs text-muted-foreground">
                  Automatically fix and create a pull request
                </div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={autoResolveIssue}>
              <div>
                <div>Auto Resolve Issue</div>
                <div className="text-xs text-muted-foreground">
                  Run the autoResolveIssue workflow
                </div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
