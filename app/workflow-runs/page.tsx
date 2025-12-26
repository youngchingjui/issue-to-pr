import { Suspense } from "react"
import { withTiming } from "shared/utils/telemetry"

import { auth } from "@/auth"
import TableSkeleton from "@/components/layout/TableSkeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  IssueTitlesTableBody,
  TableBodyFallback,
} from "@/components/workflow-runs/WorkflowRunsIssueTitlesTableBody"
import { listUserRepositories } from "@/lib/github/graphql/queries/listUserRepositories"
import { listWorkflowRuns } from "@/lib/neo4j/services/workflow"

// There were build errors
// "Dynamic server usage: Route /workflow-runs couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error"
// Making this dynamic to avoid those errors
export const dynamic = "force-dynamic"

async function getPermittedWorkflowRuns(login?: string) {
  const allRunsPromise = withTiming("Neo4j READ: listWorkflowRuns (page)", () =>
    listWorkflowRuns()
  )
  const reposPromise = withTiming(
    "GitHub GraphQL: listUserRepositories (page)",
    () => listUserRepositories()
  )
  const [allRuns, repos] = await withTiming(
    "Parallel fetch: workflow runs + repos",
    () => Promise.all([allRunsPromise, reposPromise])
  )

  try {
    const allowed = new Set(repos.map((r) => r.nameWithOwner))

    return allRuns.filter((run) => {
      // Show if initiated by me
      if (login && run.initiatorGithubLogin === login) return true
      // Show if the user has access to the repo
      if (run.issue) return allowed.has(run.issue.repoFullName)
      return false
    })
  } catch (err) {
    console.error("[WorkflowRunsPage] Failed to list user repositories", err)
    return []
  }
}

export default async function WorkflowRunsPage() {
  return await withTiming("Render: WorkflowRunsPage", async () => {
    const session = await withTiming("NextAuth: auth()", () => auth())
    const login = session?.profile?.login
    const runsPromise = withTiming("getPermittedWorkflowRuns()", () =>
      getPermittedWorkflowRuns(login)
    )

    const workflows = await runsPromise

    // Extract token for lazy, batched issue title fetch in a child component
    const token =
      typeof session?.token === "object" &&
      session?.token &&
      "access_token" in session.token
        ? String((session.token as Record<string, unknown>)["access_token"])
        : undefined

    return (
      <main className="container mx-auto p-4">
        <div className="max-w-screen-xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Workflow Runs</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Runs you started and runs on repositories you own.
          </p>
        </div>
        <Suspense fallback={<TableSkeleton />}>
          <Card className="max-w-screen-xl mx-auto rounded">
            <CardContent>
              {workflows.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  No workflow runs visible to you yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-4 text-base font-medium">
                        Run ID
                      </TableHead>
                      <TableHead className="py-4 text-base font-medium">
                        Status
                      </TableHead>
                      <TableHead className="py-4 text-base font-medium">
                        Started
                      </TableHead>
                      <TableHead className="py-4 text-base font-medium">
                        Issue
                      </TableHead>
                      <TableHead className="py-4 text-base font-medium">
                        Workflow Type
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  {/* Render immediately with stored titles; stream fetched titles via Suspense */}
                  <Suspense
                    fallback={<TableBodyFallback workflows={workflows} />}
                  >
                    <IssueTitlesTableBody workflows={workflows} token={token} />
                  </Suspense>
                </Table>
              )}
            </CardContent>
          </Card>
        </Suspense>
      </main>
    )
  })
}

