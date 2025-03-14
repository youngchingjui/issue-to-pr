"use client"

import { useState } from "react"

import DataTable from "@/components/common/DataTable"
import ResolutionPlanDrawer from "@/components/issues/controllers/ResolutionPlanDrawer"
import IssueRow from "@/components/issues/IssueRow"
import { toast } from "@/hooks/use-toast"
import { GitHubIssue } from "@/lib/types/github"

interface IssueTableProps {
  initialIssues: GitHubIssue[]
}

export default function IssueTable({ initialIssues }: IssueTableProps) {
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null)

  const handleGenerateResolutionPlan = (issue: GitHubIssue) => {
    setSelectedIssue(issue)
  }

  const handleError = (message: string) => {
    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    })
    setSelectedIssue(null)
  }

  return (
    <div>
      <DataTable
        title="Issues"
        items={initialIssues}
        renderRow={(issue) => (
          <IssueRow
            key={issue.id}
            issue={issue}
            onGenerateResolutionPlan={() => handleGenerateResolutionPlan(issue)}
          />
        )}
        emptyMessage="No open issues found."
      />
      <ResolutionPlanDrawer
        issue={selectedIssue}
        onComplete={() => setSelectedIssue(null)}
        onError={handleError}
      />
    </div>
  )
}
