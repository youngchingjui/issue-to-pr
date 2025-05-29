"use client"

import { useState } from "react"
import React from "react"

import DataRow from "@/components/common/DataRow"
import CreatePRController from "@/components/issues/controllers/CreatePRController"
import GenerateResolutionPlanController from "@/components/issues/controllers/GenerateResolutionPlanController"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { IssueWithStatus } from "@/lib/github/issues"

function PlanIcon() {
  // Inline SVG for a plan (document) icon
  return (
    <svg height="18" viewBox="0 0 20 20" width="18" fill="none" className="inline align-text-bottom mr-0.5 text-blue-600">
      <rect x="3" y="2" width="14" height="16" rx="2" stroke="#2563EB" strokeWidth="1.5" fill="#DBEAFE" />
      <path d="M7 6h6M7 10h6M7 14h3" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function PRIcon() {
  // Inline SVG for a PR (pull request, link-style) icon
  return (
    <svg height="18" viewBox="0 0 20 20" width="18" fill="none" className="inline align-text-bottom text-green-600">
      <rect x="4.5" y="3.5" width="4" height="4" rx="2" stroke="#22C55E" strokeWidth="1.5" fill="#DCFCE7" />
      <rect x="11.5" y="12.5" width="4" height="4" rx="2" stroke="#22C55E" strokeWidth="1.5" fill="#DCFCE7" />
      <path d="M12.5 7v1.5c0 2-1.5 3.5-3.5 3.5H6" stroke="#22C55E" strokeWidth="1.3" />
    </svg>
  )
}

interface IssueRowProps {
  issue: IssueWithStatus
  repoFullName: string
}

export default function IssueRow({ issue, repoFullName }: IssueRowProps) {
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

  // Render status indicators for plan and PR
  function StatusIndicators() {
    return (
      <TooltipProvider>
        <div className="flex flex-row gap-2">
          {issue.hasPlan && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <PlanIcon />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">Plan ready</TooltipContent>
            </Tooltip>
          )}
          {issue.hasPR && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <PRIcon />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">PR ready</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    )
  }

  return (
    <DataRow
      title={
        <>
          {issue.title} <StatusIndicators />
        </>
      }
      number={issue.number}
      url={localIssueUrl}
      user={issue.user?.login}
      state={issue.state}
      updatedAt={issue.updated_at}
      isLoading={isLoading}
      activeWorkflow={activeWorkflow}
      openInNewTab={false}
    >
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
    </DataRow>
  )
}
