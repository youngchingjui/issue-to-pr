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
import { listWorkflowRuns } from "@/lib/neo4j/services/workflow"

export default async function WorkflowRunsPage() {
  const workflows = await listWorkflowRuns()

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
                    Type
                  </TableHead>
                  <TableHead className="py-4 text-base font-medium">
                    Issue
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
                {workflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell className="py-4">
                      <Link
                        href={`/workflow-runs/${workflow.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {workflow.id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="secondary">{workflow.type}</Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      {workflow.issue?.number && workflow.issue?.repoFullName ? (
                        <Link
                          href={`/${workflow.issue.repoFullName}/issues/${workflow.issue.number}`}
                          className="text-blue-600 hover:underline"
                        >
                          #{workflow.issue.number} @ {workflow.issue.repoFullName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          workflow.state === "completed"
                            ? "default"
                            : workflow.state === "error"
                              ? "destructive"
                              : workflow.state === "cancelled"
                                ? "outline"
                                : "secondary"
                        }
                        className={
                          workflow.state === "cancelled"
                            ? "bg-red-200 text-red-800 border-red-500 font-bold"
                            : ""
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
    </main>
  )
}
