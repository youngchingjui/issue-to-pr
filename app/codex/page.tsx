import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Suspense } from "react"

import TableSkeleton from "@/components/layout/TableSkeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAuthenticatedUserRepositories } from "@/lib/github/content"
import { listWorkflowRuns } from "@/lib/neo4j/services/workflow"

import CodexForm from "./CodexForm"

export default async function CodexPage() {
  const { repositories } = await getAuthenticatedUserRepositories({
    per_page: 100,
  })
  const runs = await listWorkflowRuns()

  return (
    <main className="container mx-auto p-4 space-y-8">
      <h1 className="text-3xl font-bold">Codex</h1>
      <CodexForm
        repositories={repositories.map((r) => ({
          id: r.id,
          full_name: r.full_name,
        }))}
      />
      <div>
        <h2 className="text-2xl font-semibold mb-4">Workflow Runs</h2>
        <Suspense fallback={<TableSkeleton />}>
          <Card className="max-w-screen-xl mx-auto rounded">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-4 text-base font-medium">
                      Name
                    </TableHead>
                    <TableHead className="py-4 text-base font-medium">
                      Status
                    </TableHead>
                    <TableHead className="py-4 text-base font-medium">
                      Started
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((workflow) => (
                    <TableRow key={workflow.id}>
                      <TableCell className="py-4">
                        <Link
                          href={`/workflow-runs/${workflow.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {workflow.id.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            workflow.state === "completed"
                              ? "default"
                              : workflow.state === "error"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {workflow.state}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-muted-foreground">
                        {workflow.createdAt
                          ? formatDistanceToNow(workflow.createdAt, {
                              addSuffix: true,
                            })
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Suspense>
      </div>
    </main>
  )
}
