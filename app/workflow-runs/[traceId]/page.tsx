import Link from "next/link"
import { notFound } from "next/navigation"

import BaseGitHubItemCard from "@/components/github/BaseGitHubItemCard"
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
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">
          {workflowMetadata.workflowType === "commentOnIssue"
            ? "Comment on Issue Workflow"
            : "Workflow Run"}{" "}
          - {issue.title}
        </h1>
        <div className="flex flex-col gap-4">
          <Link
            href={`/${owner}/${repo}/issues/${issue.number}`}
            className="block"
          >
            <BaseGitHubItemCard
              item={{
                ...issue,
                type: "issue",
              }}
            />
          </Link>
          <h2 className="text-xl font-semibold">Workflow Timeline</h2>
          <WorkflowRunDetail events={workflow.events} />
        </div>
      </div>
    </main>
  )
}
