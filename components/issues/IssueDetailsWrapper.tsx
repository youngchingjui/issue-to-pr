"use client"

import { useState } from "react"

import MarkdownRenderer from "@/components/blog/MarkdownRenderer"
import GitHubItemDetails from "@/components/contribute/GitHubItemDetails"
import { GitHubIssue, WorkflowType } from "@/lib/types/github"

interface IssueDetailsWrapperProps {
  issue: GitHubIssue
  requirements?: string
}

export default function IssueDetailsWrapper({
  issue,
  requirements,
}: IssueDetailsWrapperProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowType | null>(
    null
  )

  return (
    <div className="flex flex-col gap-4">
      {requirements && requirements.trim() ? (
        <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg bg-muted p-4">
          <h3 className="mt-0">Requirements</h3>
          <MarkdownRenderer content={requirements} />
        </div>
      ) : null}
      <GitHubItemDetails
        item={{
          ...issue,
          type: "issue",
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
    </div>
  )
}

