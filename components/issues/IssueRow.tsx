"use client"

import Image from "next/image"
import { useState } from "react"
import React from "react"

import DataRow from "@/components/common/DataRow"
import CreatePRController from "@/components/issues/controllers/CreatePRController"
import GenerateResolutionPlanController from "@/components/issues/controllers/GenerateResolutionPlanController"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { IssueWithStatus } from "@/lib/github/issues"

function PlanIcon() {
  // Use external SVG for plan icon
  return (
    <Image
      src="/svg/plan.svg"
      alt="Plan icon"
      height={18}
      width={18}
      className="inline align-text-bottom mr-0.5 text-blue-600"
    />
  )
}

function PRIcon() {
  // Use external SVG for PR icon
  return (
    <Image
      src="/svg/pr.svg"
      alt="PR icon"
      height={18}
      width={18}
      className="inline align-text-bottom text-green-600"
    />
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
      title={issue.title}
      number={issue.number}
      url={localIssueUrl}
      user={issue.user?.login}
      state={issue.state}
      updatedAt={issue.updated_at}
      isLoading={isLoading}
      activeWorkflow={activeWorkflow}
      openInNewTab={false}
      statusIndicators={<StatusIndicators />}
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
