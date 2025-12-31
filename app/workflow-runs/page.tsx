import { redirect } from "next/navigation"
import { Suspense } from "react"

import { auth } from "@/auth"
import TableSkeleton from "@/components/layout/TableSkeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { IssueTitlesTableBody } from "@/components/workflow-runs/WorkflowRunsIssueTitlesTableBody"
import { neo4jDs } from "@/lib/neo4j"
import { StorageAdapter } from "@/shared/adapters/neo4j/StorageAdapter"

export default async function WorkflowRunsPage() {
  const uri = process.env.NEO4J_URI
  const user = process.env.NEO4J_USER
  const password = process.env.NEO4J_PASSWORD
  if (!uri || !user || !password) {
    throw new Error("NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD must be set")
  }

  const session = await auth()
  const login = session?.user?.name
  const token = session?.token?.access_token

  if (!login || !token) {
    redirect("/api/auth/signin")
  }

  const storage = new StorageAdapter(neo4jDs)

  const workflows = await storage.runs.list({
    by: "initiator",
    user: { id: login },
  })

  return (
    <main className="container mx-auto p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Workflow Runs</h1>
        <p className="text-sm text-muted-foreground">
          Runs you started and runs on repositories you own.
        </p>
      </div>
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
              <Suspense fallback={<TableSkeleton />}>
                <IssueTitlesTableBody workflows={workflows} token={token} />
              </Suspense>
            </Table>
          </CardContent>
        </Card>
      </Suspense>
    </main>
  )
}
