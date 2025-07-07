import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import BaseGitHubItemCard from "@/components/github/BaseGitHubItemCard"
import { Button } from "@/components/ui/button"
import { getIssue } from "@/lib/github/issues"
import { getWorkflowRunWithDetails } from "@/lib/neo4j/services/workflow"
import { AnyEvent, Issue } from "@/lib/types"
import { GetIssueResult } from "@/lib/types/github"
import WorkflowTimeline from "@/components/workflow-runs/WorkflowTimeline"

// Keep for server data fetch typing and reuse
export default async function WorkflowRunDetailPage({
  params,
}: {
  params: { traceId: string }
}) {
  const { traceId } = params

  const { workflow, events, issue } = await getWorkflowRunWithDetails(traceId)

  let githubIssue: GetIssueResult | null = null
  if (issue) {
    githubIssue = await getIssue({
      fullName: issue.repoFullName,
      issueNumber: issue.number,
    })

    if (githubIssue.type !== "success") {
      notFound()
    }
  }

  // If no workflow was found
  if (!workflow) {
    notFound()
  }

  if (!workflow.type) {
    console.error(
      `Workflow type not found. WorkflowRun: ${JSON.stringify(workflow)}`
    )
  }

  return (
    <main className="container mx-auto p-4">
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Link href="/workflow-runs">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Workflows
            </Button>
          </Link>
        </div>

        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">
            {issue?.title || `Workflow Run: ${traceId}`}
          </h1>
          {workflow.type && (
            <p className="text-sm text-muted-foreground">
              Workflow Type:{" "}
              {workflow.type === "commentOnIssue"
                ? "Comment on Issue"
                : workflow.type}
            </p>
          )}
        </div>

        {/* Context Section - Only show if issue exists */}
        {githubIssue && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Associated Issue</h2>
            <div className="max-w-2xl">
              <BaseGitHubItemCard
                item={{ ...githubIssue.issue, type: "issue" }}
              />
            </div>
          </div>
        )}

        {/* Timeline Section */}
        <WorkflowTimeline workflowId={traceId} issue={issue} initialEvents={events} />
      </div>
    </main>
  )
}
