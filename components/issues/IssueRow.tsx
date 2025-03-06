"use client"

import { formatDistanceToNow } from "date-fns"
import { ChevronDown, Loader2, PlayCircle } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import React from "react"

import CreatePRController from "@/components/issues/controllers/CreatePRController"
import GenerateResolutionPlanController from "@/components/issues/controllers/GenerateResolutionPlanController"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import { GitHubIssue, GitHubRepository } from "@/lib/types"

interface IssueRowProps {
  issue: GitHubIssue
  repo: GitHubRepository
}

export default function IssueRow({ issue, repo }: IssueRowProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)

  const createPRController = CreatePRController({
    issueNumber: issue.number,
    repo,
    onStart: () => {
      setIsLoading(true)
      setActiveWorkflow("create-pr")
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

  const generateResolutionPlanController = GenerateResolutionPlanController({
    issueNumber: issue.number,
    repo,
    onStart: () => {
      setIsLoading(true)
      setActiveWorkflow("resolution-plan")
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
    <TableRow key={issue.id}>
      <TableCell className="py-4">
        <div className="flex flex-col gap-1">
          <div className="font-medium text-base">
            <Link
              href={`https://github.com/${repo.full_name}/issues/${issue.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {issue.title}
            </Link>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span>#{issue.number}</span>
            <span>•</span>
            <span>{issue.user.login}</span>
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
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {activeWorkflow === "create-pr"
                    ? "Creating PR..."
                    : "Generating Plan..."}
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
            <DropdownMenuItem
              onClick={generateResolutionPlanController.execute}
            >
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
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
