import { Suspense } from "react"

import { auth } from "@/auth"
import TableSkeleton from "@/components/layout/TableSkeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  IssueTitlesTableBody,
  TableBodyFallback,
} from "@/components/workflow-runs/WorkflowRunsIssueTitlesTableBody"
import { neo4jDs } from "@/lib/neo4j"
import { StorageAdapter } from "@/shared/adapters/neo4j/StorageAdapter"

// There were build errors
// "Dynamic server usage: Route /workflow-runs couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error"
// Making this dynamic to avoid those errors
export const dynamic = "force-dynamic"

/**
 * Fetch workflow runs initiated by the current user.
 * Uses the INITIATED_BY relationship to filter runs, so users only see their own runs.
 */
async function getWorkflowRunsForUser() {
  const session = await auth()
  // Use profile.login (GitHub username) not user.name (display name)
  const login = session?.profile?.login
  if (!login) return []

  const storage = new StorageAdapter(neo4jDs)
  return await storage.workflow.run.list({ userId: login })
}

export default async function WorkflowRunsPage() {
  const runsPromise = getWorkflowRunsForUser()
  const authPromise = auth()
  const [workflows, session] = await Promise.all([runsPromise, authPromise])

  // Extract token for lazy, batched issue title fetch in a child component
  const token =
    typeof session?.token === "object" &&
    session?.token &&
    "access_token" in session.token
      ? String((session.token as Record<string, unknown>)["access_token"])
      : undefined

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Your workflow runs</h1>
      <p className="text-muted-foreground mb-4">
        Workflow runs you have initiated.
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
              {/* Render immediately with stored titles; stream fetched titles via Suspense */}
              <Suspense fallback={<TableBodyFallback workflows={workflows} />}>
                <IssueTitlesTableBody workflows={workflows} token={token} />
              </Suspense>
            </Table>
          </CardContent>
        </Card>
      </Suspense>
    </main>
  )
}
