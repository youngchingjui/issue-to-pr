"use client"

import { useEffect, useState } from "react"
import React from "react"

import DataRow from "@/components/common/DataRow"
import CreatePRController from "@/components/issues/controllers/CreatePRController"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { GitHubIssue } from "@/lib/types/github"
import { extractRepoFullNameFromIssue } from "@/lib/utils/utils-common"

interface IssueRowProps {
  issue: GitHubIssue
  onGenerateResolutionPlan: () => void
}

export default function IssueRow({
  issue,
  onGenerateResolutionPlan,
}: IssueRowProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)

  // Reset loading state when switching to a different workflow
  useEffect(() => {
    if (!activeWorkflow) {
      setIsLoading(false)
    }
  }, [activeWorkflow])

  const repoFullName = extractRepoFullNameFromIssue(issue)

  if (!repoFullName) {
    console.error(
      "Could not determine repository information for issue:",
      issue
    )
    return null
  }

  const handleGenerateResolutionPlan = () => {
    onGenerateResolutionPlan()
    setIsLoading(true)
    setActiveWorkflow("Generating Plan...")
  }

  const { execute: executePRCreation } = CreatePRController({
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

  return (
    <DataRow
      title={issue.title}
      number={issue.number}
      url={`https://github.com/${repoFullName}/issues/${issue.number}`}
      user={issue.user.login}
      state={issue.state}
      updatedAt={issue.updated_at}
      isLoading={isLoading}
      activeWorkflow={activeWorkflow}
    >
      <DropdownMenuItem onClick={handleGenerateResolutionPlan}>
        <div>
          <div>Generate Resolution Plan</div>
          <div className="text-xs text-muted-foreground">
            Get an AI-powered plan to resolve this issue
          </div>
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={executePRCreation}>
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
