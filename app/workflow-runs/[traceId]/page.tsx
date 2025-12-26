import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { auth } from "@/auth"
import BaseGitHubItemCard from "@/components/github/BaseGitHubItemCard"
import { Button } from "@/components/ui/button"
import ContainerManager from "@/components/workflow-runs/ContainerManager"
import WorkflowRunEventsFeed from "@/components/workflow-runs/WorkflowRunEventsFeed"
import { getContainerStatus } from "@/lib/docker"
import { getIssue } from "@/lib/github/issues"
import { getWorkflowRunWithDetails } from "@/lib/neo4j/services/workflow"
import { GetIssueResult } from "@/lib/types/github"
import { containerNameForTrace } from "@/lib/utils/utils-common"

export default async function WorkflowRunDetailPage({
  params,
}: {
  params: { traceId: string }
}) {
  const { traceId } = params

  const session = await auth()
  const login = session?.profile?.login
  if (!login) notFound()

  const { workflow, events, issue } = await getWorkflowRunWithDetails(traceId)

  const isOwnedByUser = (repoFullName?: string) => {
    if (!repoFullName) return false
    const [owner] = repoFullName.split("/")
    return owner.toLowerCase() === String(login).toLowerCase()
  }

  const authorized =
    (workflow.initiatorGithubLogin &&
      workflow.initiatorGithubLogin === login) ||
    (issue && isOwnedByUser(issue.repoFullName))

  if (!authorized) {
    notFound()
  }

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

  // Determine container status (best-effort; failures fall back to "not_found")
  const containerName = containerNameForTrace(traceId)
  const containerStatus = await getContainerStatus(containerName)

  // Prefer live GitHub title if available, otherwise fall back to stored issue title or a generic label
  const headerTitle =
    (githubIssue && githubIssue.issue?.title) ||
    issue?.title ||
    `Workflow Run: ${traceId}`

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
          <h1 className="text-2xl font-bold flex items-center gap-3 flex-wrap">
            {headerTitle}
          </h1>
          {/* Container actions & status */}
          <ContainerManager
            workflowId={traceId}
            initialStatus={containerStatus}
          />
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
                item={{ ...githubIssue.issue, itemType: "issue" }}
              />
            </div>
          </div>
        )}

        {/* Timeline Section */}
        {events && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Timeline</h2>
            <WorkflowRunEventsFeed
              workflowId={traceId}
              initialEvents={events}
              issue={issue}
            />
          </div>
        )}
      </div>
    </main>
  )
}

