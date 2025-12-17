"use client"

import { useState } from "react"

import GitHubItemDetails from "@/components/contribute/GitHubItemDetails"
import { GitHubIssue, WorkflowType } from "@/lib/types/github"

interface IssueDetailsWrapperProps {
  issue: GitHubIssue
}

export default function IssueDetailsWrapper({
  issue,
}: IssueDetailsWrapperProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowType | null>(
    null
  )

  return (
    <GitHubItemDetails
      item={{
        ...issue,
        itemType: "issue",
      }}
      isLoading={isLoading}
      activeWorkflow={activeWorkflow}
      onWorkflowStart={(workflow) => {
        setIsLoading(true)
        setActiveWorkflow(workflow)
      }}
      onWorkflowComplete={() => {
        setIsLoading(false)
        setActiveWorkflow(null)
      }}
      onWorkflowError={() => {
        setIsLoading(false)
        setActiveWorkflow(null)
      }}
    />
  )
}
