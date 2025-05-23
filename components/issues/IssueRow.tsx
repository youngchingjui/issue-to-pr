"use client"

import { useState } from "react"
import React from "react"

import DataRow from "@/components/common/DataRow"
import CreatePRController from "@/components/issues/controllers/CreatePRController"
import GenerateResolutionPlanController from "@/components/issues/controllers/GenerateResolutionPlanController"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { GitHubIssue } from "@/lib/types/github"

interface IssueRowProps {
  issue: GitHubIssue
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
