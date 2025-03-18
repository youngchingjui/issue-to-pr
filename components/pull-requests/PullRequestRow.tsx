"use client"

import { useState } from "react"

import DataRow from "@/components/common/DataRow"
import AnalyzePRController from "@/components/pull-requests/controllers/AnalyzePRController"
import ReviewPRController from "@/components/pull-requests/controllers/ReviewPRController"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { PullRequest } from "@/lib/types/github"

export default function PullRequestRow({ pr }: { pr: PullRequest }) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)

  const analyzeWorkflow = AnalyzePRController({
    repoFullName: pr.head.repo.full_name,
    pullNumber: pr.number,
    onStart: () => {
      setIsLoading(true)
      setActiveWorkflow("Analyzing...")
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

  const reviewWorkflow = ReviewPRController({
    repoFullName: pr.head.repo.full_name,
    pullNumber: pr.number,
    onStart: () => {
      setIsLoading(true)
      setActiveWorkflow("Reviewing...")
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
      title={pr.title}
      number={pr.number}
      url={`https://github.com/${pr.head.repo.full_name}/pull/${pr.number}`}
      user={pr.user?.login}
      state={pr.state}
      updatedAt={pr.updated_at}
      isLoading={isLoading}
      activeWorkflow={activeWorkflow}
    >
      <DropdownMenuItem onClick={reviewWorkflow.execute}>
        <div>
          <div>Review Pull Request</div>
          <div className="text-xs text-muted-foreground">
            Get an AI-powered review of the changes
          </div>
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={analyzeWorkflow.execute}>
        <div>
          <div>Analyze PR Goals</div>
          <div className="text-xs text-muted-foreground">
            Analyze the goals and requirements
          </div>
        </div>
      </DropdownMenuItem>
    </DataRow>
  )
}
