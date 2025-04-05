import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import BaseGitHubItemCard from "@/components/github/BaseGitHubItemCard"
import { Button } from "@/components/ui/button"
import WorkflowRunDetail from "@/components/workflow-runs/WorkflowRunDetail"
import { getIssue } from "@/lib/github/issues"
import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"

export default async function WorkflowRunDetailPage({
  params,
}: {
  params: { traceId: string }
}) {
  const { traceId } = params

  const workflow = await new WorkflowPersistenceService()
    .getWorkflowEvents(traceId)
    .catch(() => null)

  // If no workflow was found
  if (!workflow || workflow.events.length === 0) {
    notFound()
  }

  // Get workflow metadata
  const workflowMetadata = workflow.metadata as {
    workflowType: string
    issue: {
      number: number
      /** Full repository name in the format 'owner/repo' (e.g. 'octocat/Hello-World') */
      repoFullName: string
      title?: string
    }
    postToGithub: boolean
  }

  if (!workflowMetadata?.issue) {
    notFound()
  }

  // Fetch full issue details
  const issue = await getIssue({
    fullName: workflowMetadata.issue.repoFullName,
    issueNumber: workflowMetadata.issue.number,
  }).catch(() => null)

  if (!issue) {
    notFound()
  }

  // Extract owner and repo from repoFullName for the link
  const [owner, repo] = workflowMetadata.issue.repoFullName.split("/")

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
          <h1 className="text-2xl font-bold">{issue.title}</h1>
          <p className="text-sm text-muted-foreground">
            Workflow Type:{" "}
            {workflowMetadata.workflowType === "commentOnIssue"
              ? "Comment on Issue"
              : "Unknown Workflow"}
          </p>
        </div>

        {/* Context Section */}
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

        {/* Timeline Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Workflow Timeline</h2>
          <WorkflowRunDetail events={workflow.events} />
        </div>
      </div>
    </main>
  )
}
