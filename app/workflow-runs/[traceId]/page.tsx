import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import BaseGitHubItemCard from "@/components/github/BaseGitHubItemCard"
import { Button } from "@/components/ui/button"
import {
  ErrorEvent,
  LLMResponseEvent,
  StatusUpdate,
  SystemPromptEvent,
  ToolCallEvent,
  ToolCallResultEvent,
  UserMessageEvent,
} from "@/components/workflow-runs/events"
import { getIssue } from "@/lib/github/issues"
import { n4j } from "@/lib/neo4j/service"
import { AnyEvent, Issue } from "@/lib/types"
import { GitHubIssue } from "@/lib/types/github"

function EventRenderer({
  event,
  issue,
}: {
  event: AnyEvent
  issue?: Issue
}): React.ReactNode {
  // Basic event

  switch (event.type) {
    case "status":
      return <StatusUpdate event={event} />
    case "systemPrompt":
      return <SystemPromptEvent event={event} />
    case "userMessage":
      return <UserMessageEvent event={event} />
    case "llmResponse":
    case "llmResponseWithPlan":
      return <LLMResponseEvent event={event} issue={issue} />
    case "toolCall":
      return <ToolCallEvent event={event} />
    case "toolCallResult":
      return <ToolCallResultEvent event={event} />
    case "workflowState":
      return <StatusUpdate event={event} />
    case "reviewComment":
      return <UserMessageEvent event={event} />
    case "error":
      return <ErrorEvent event={event} />
    default:
      console.error(`Unrecognized event: ${JSON.stringify(event)}`)
      return null
  }
}

export default async function WorkflowRunDetailPage({
  params,
}: {
  params: { traceId: string }
}) {
  const { traceId } = params

  const { workflow, events, issue } = await n4j.getWorkflowRunWithDetails({
    workflowRunId: traceId,
  })

  let githubIssue: GitHubIssue | null = null
  if (issue) {
    githubIssue = await getIssue({
      fullName: issue.repoFullName,
      issueNumber: issue.number,
    })
  }

  // If no workflow was found
  if (!workflow) {
    notFound()
  }

  if (!workflow.workflowType) {
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
          {workflow.workflowType && (
            <p className="text-sm text-muted-foreground">
              Workflow Type:{" "}
              {workflow.workflowType === "commentOnIssue"
                ? "Comment on Issue"
                : workflow.workflowType}
            </p>
          )}
        </div>

        {/* Context Section - Only show if issue exists */}
        {githubIssue && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Associated Issue</h2>
            <div className="max-w-2xl">
              <BaseGitHubItemCard item={{ ...githubIssue, type: "issue" }} />
            </div>
          </div>
        )}

        {/* Timeline Section */}
        {events && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Timeline</h2>
            <div className="bg-card border rounded-lg overflow-hidden">
              {events.map((event) => (
                <div key={event.id} className="p-3 sm:p-4">
                  <EventRenderer event={event} issue={issue} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
