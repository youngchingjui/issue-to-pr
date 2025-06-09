"use server"

import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listWorkflowRunsForRepo } from "@/lib/neo4j/services/workflow"

interface Props {
  repoFullName: string
}

export default async function RepoWorkflowRuns({ repoFullName }: Props) {
  const runs = await listWorkflowRunsForRepo(repoFullName)

  if (runs.length === 0) {
    return null // Don't show anything if no workflows
  }

  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <CardTitle className="text-xl mb-4">Recent Workflow Runs</CardTitle>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell>
                  <Link
                    href={`/workflow-runs/${run.id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {run.id.slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell>{run.type}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      run.state === "completed"
                        ? "default"
                        : run.state === "error"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {run.state}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {run.createdAt
                    ? formatDistanceToNow(run.createdAt, {
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
  )
}
