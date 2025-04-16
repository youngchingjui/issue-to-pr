import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import BaseGitHubItemCard from "@/components/github/BaseGitHubItemCard"
import { Button } from "@/components/ui/button"
import WorkflowRunDetail from "@/components/workflow-runs/WorkflowRunDetail"
import { getIssue } from "@/lib/github/issues"
import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"
import { WorkflowWithEvents } from "@/lib/types/workflow"

export default async function WorkflowRunDetailPage({
  params,
}: {
  params: { traceId: string }
}) {
  const { traceId } = params

  const workflow: WorkflowWithEvents | null =
    await new WorkflowPersistenceService()
      .getWorkflowEvents(traceId)
      .catch(() => null)

  // If no workflow was found
  if (!workflow) {
    notFound()
  }

  // Fetch issue details if issue exists
  const issue = workflow.issue
    ? await getIssue({
        fullName: workflow.issue.repoFullName,
        issueNumber: workflow.issue.number,
      }).catch(() => null)
    : null

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
          {workflow.metadata?.workflowType && (
            <p className="text-sm text-muted-foreground">
              Workflow Type:{" "}
              {workflow.metadata.workflowType === "commentOnIssue"
                ? "Comment on Issue"
                : workflow.metadata.workflowType}
            </p>
          )}
        </div>

        {/* Context Section - Only show if issue exists */}
        {issue && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Associated Issue</h2>
            <div className="max-w-2xl">
              <BaseGitHubItemCard
                item={{
                  ...issue,
                  type: "issue",
                }}
              />
            </div>
          </div>
        )}

        {/* Timeline Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Timeline</h2>
          <WorkflowRunDetail events={workflow.events} />
        </div>
      </div>
    </main>
  )
}
