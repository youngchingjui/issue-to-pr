import Link from "next/link"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import MicrophoneRecordingDraft from "@/components/playground/MicrophoneRecordingDraft"
import CreatedPullRequestCard from "@/components/pull-requests/CreatedPullRequestCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToolCallResultEvent } from "@/components/workflow-runs/events/ToolCallResultEvent"
import { getGithubUser } from "@/lib/github/users"
import { getUserRoles } from "@/lib/neo4j/services/user"
import { type ToolCallResult } from "@/lib/types"

import { ResolveIssueCard } from "./ResolveIssueCard"

export default async function ComponentsLibraryPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/")
  }

  const githubUser = await getGithubUser()
  const roles = githubUser
    ? await getUserRoles(githubUser.login).catch(() => [])
    : []
  const isAdmin = roles.includes("admin")
  if (!isAdmin) {
    redirect("/")
  }

  // Mock success event for create_pull_request
  const prSuccessEvent: ToolCallResult = {
    id: "mock-success",
    createdAt: new Date(),
    workflowId: "mock-workflow",
    type: "toolCallResult",
    toolCallId: "mock-tool-call-id",
    toolName: "create_pull_request",
    content: JSON.stringify({
      status: "success",
      pullRequest: {
        data: {
          number: 42,
          title: "Add error UI for PR creation",
          body: "This PR adds clear error handling to the tool result UI.",
          url: "https://github.com/issue-to-pr/test-repo/pull/42",
        },
      },
      message: "PR created; label added.",
    }),
  }

  // Mock error event for create_pull_request
  const prErrorEvent: ToolCallResult = {
    id: "mock-error",
    createdAt: new Date(),
    workflowId: "mock-workflow",
    type: "toolCallResult",
    toolCallId: "mock-tool-call-id-2",
    toolName: "create_pull_request",
    content: JSON.stringify({
      status: "error",
      message:
        "Failed to create pull request: A pull request already exists for branch 'feature/error-ui'",
    }),
  }

  return (
    <div className="space-y-8 px-4 py-8 md:container md:mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Components Library</h1>
        <p className="text-muted-foreground">
          Preview commonly used UI components with mock data.
        </p>
        <div className="mt-3">
          <Link href="/playground">
            <Button variant="secondary" size="sm">
              Back to Playground
            </Button>
          </Link>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Pull Request</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>CreatedPullRequestCard</CardTitle>
            </CardHeader>
            <CardContent>
              <CreatedPullRequestCard
                number={123}
                title="Implement components library playground"
                body="Adds a new /playground/components page to preview UI components with mock data."
                url="https://github.com/issue-to-pr/test-repo/pull/123"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ToolCallResultEvent (Success)</CardTitle>
            </CardHeader>
            <CardContent>
              <ToolCallResultEvent event={prSuccessEvent} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ToolCallResultEvent (Error)</CardTitle>
            </CardHeader>
            <CardContent>
              <ToolCallResultEvent event={prErrorEvent} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Use Cases</h2>
        <div className="grid gap-4">
          <ResolveIssueCard />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Voice / Recording</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <MicrophoneRecordingDraft />
        </div>
      </section>
    </div>
  )
}
