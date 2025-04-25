import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import BaseGitHubItemCard from "@/components/github/BaseGitHubItemCard"
import { Button } from "@/components/ui/button"
import {
  DefaultEvent,
  ErrorEvent,
  LLMResponseEvent,
  StatusUpdate,
  SystemPromptEvent,
  ToolCallEvent,
  ToolResponseEvent,
  UserMessageEvent,
} from "@/components/workflow-runs/events"
import { getIssue } from "@/lib/github/issues"
import { n4j } from "@/lib/neo4j/service"
import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"
import { WorkflowWithEvents } from "@/lib/types/workflow"
import { WorkflowEvent } from "@/lib/types/workflow"

function EventContent({
  event,
  issue,
}: {
  event: WorkflowEvent
  issue?: { number: number; repoFullName: string }
}) {
  switch (event.type) {
    case "status":
      return <StatusUpdate event={event} timestamp={event.timestamp} />
    case "system_prompt":
      return <SystemPromptEvent event={event} timestamp={event.timestamp} />
    case "llm_response":
      return (
        <LLMResponseEvent
          event={event}
          timestamp={event.timestamp}
          issue={issue}
        />
      )
    case "user_message":
      return <UserMessageEvent event={event} timestamp={event.timestamp} />
    case "tool_call":
      return <ToolCallEvent event={event} />
    case "tool_response":
      return <ToolResponseEvent event={event} />
    case "error":
      return <ErrorEvent event={event} />
    default:
      return <DefaultEvent event={event} />
  }
}

export default async function WorkflowRunDetailPage({
  params,
}: {
  params: { traceId: string }
}) {
  const { traceId } = params

  // const workflow = await n4j.getWorkflow(workflowId)
  // const events = await n4j.listEventsForWorkflow(workflowId)
  // const issue = await n4j.getIssueFromWorkflow(workflowId)
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
        {workflow.events && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Timeline</h2>
            <div className="bg-card border rounded-lg overflow-hidden">
              {workflow.events.map((event) => (
                <div key={event.id} className="p-3 sm:p-4">
                  <EventContent event={event} issue={issue} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
