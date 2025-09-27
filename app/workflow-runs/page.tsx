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

/**
 * Filter workflow runs so that only runs which belong to repositories the
 * current user can access are shown. Visibility of public repositories is
 * already handled by GitHub – they will appear in listUserRepositories() even
 * for users who are not collaborators. Private repositories will only be
 * returned if the user has permission.
 */
async function getPermittedWorkflowRuns() {
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
      // If the run is linked to an issue, ensure the user has access to the repo
      if (run.issue) return allowed.has(run.issue.repoFullName)
      // If the run is not linked to an issue (e.g., PR-centric or internal
      // utility workflows), include it so the list shows all workflow types.
      return true
    })
  } catch (err) {
    // If we fail to retrieve the accessible repositories (likely because the
    // user is not authenticated), we return an empty array instead of leaking
    // information.
    console.error("[WorkflowRunsPage] Failed to list user repositories", err)
    return []
  }
}

export default async function WorkflowRunsPage() {
  return await withTiming("Render: WorkflowRunsPage", async () => {
    const runsPromise = withTiming("getPermittedWorkflowRuns()", () =>
      getPermittedWorkflowRuns()
    )
    const authPromise = withTiming("NextAuth: auth()", () => auth())
    const [workflows, session] = await withTiming(
      "Parallel fetch: permitted runs + auth",
      () => Promise.all([runsPromise, authPromise])
    )

    // Extract token for lazy, batched issue title fetch in a child component
    const token =
      typeof session?.token === "object" &&
      session?.token &&
      "access_token" in session.token
        ? String((session.token as Record<string, unknown>)["access_token"])
        : undefined

    return (
      <main className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Workflow Runs</h1>
        <Suspense fallback={<TableSkeleton />}>
          <Card className="max-w-screen-xl mx-auto rounded">
            <CardContent>
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
            </CardContent>
          </Card>
        </Suspense>
      </main>
    )
  })
}
