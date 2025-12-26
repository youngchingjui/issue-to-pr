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
import { listWorkflowRuns } from "@/lib/neo4j/services/workflow"

// There were build errors
// "Dynamic server usage: Route /workflow-runs couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error"
// Making this dynamic to avoid those errors
export const dynamic = "force-dynamic"

/**
 * Filter workflow runs so that only runs visible to the current user are shown.
 * Visibility rule (v1): runs initiated by the current user OR runs on repositories
 * owned by the current user.
 */
async function getPermittedWorkflowRuns(login: string | undefined | null) {
  const allRuns = await withTiming("Neo4j READ: listWorkflowRuns (page)", () =>
    listWorkflowRuns()
  )

  // If we don't have a session/login, show nothing to avoid leaking information
  if (!login) return []

  // Helper to determine repo owner from full name
  const isOwnedByUser = (repoFullName?: string) => {
    if (!repoFullName) return false
    const [owner] = repoFullName.split("/")
    return owner.toLowerCase() === String(login).toLowerCase()
  }

  try {
    return allRuns.filter((run) => {
      // Initiator-based visibility
      if (run.initiatorGithubLogin && run.initiatorGithubLogin === login) {
        return true
      }
      // Repository-ownership visibility when issue is linked
      if (run.issue && isOwnedByUser(run.issue.repoFullName)) {
        return true
      }
      return false
    })
  } catch (err) {
    console.error("[WorkflowRunsPage] Filtering error", err)
    return []
  }
}

export default async function WorkflowRunsPage() {
  return await withTiming("Render: WorkflowRunsPage", async () => {
    const session = await withTiming("NextAuth: auth()", () => auth())
    const login = session?.profile?.login
    const token =
      typeof session?.token === "object" &&
      session?.token &&
      "access_token" in session.token
        ? String((session.token as Record<string, unknown>)["access_token"])
        : undefined

    const workflows = await withTiming("getPermittedWorkflowRuns()", () =>
      getPermittedWorkflowRuns(login)
    )

    return (
      <main className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-1">Workflow Runs</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Runs you started and runs on repositories you own.
        </p>
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
                {workflows.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">
                    No workflow runs visible to you yet.
                  </div>
                ) : (
                  // Render immediately with stored titles; stream fetched titles via Suspense
                  <Suspense
                    fallback={<TableBodyFallback workflows={workflows} />}
                  >
                    <IssueTitlesTableBody workflows={workflows} token={token} />
                  </Suspense>
                )}
              </Table>
            </CardContent>
          </Card>
        </Suspense>
      </main>
    )
  })
}

