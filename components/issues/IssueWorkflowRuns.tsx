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
import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"

interface IssueWorkflowRunsProps {
  repoFullName: string
  issueNumber: number
}

export default async function IssueWorkflowRuns({
  repoFullName,
  issueNumber,
}: IssueWorkflowRunsProps) {
  // Get workflows for this specific issue
  const issueWorkflows = await WorkflowPersistenceService.getWorkflowsByIssue(
    repoFullName,
    issueNumber
  )

  if (issueWorkflows.length === 0) {
    return null // Don't show anything if no workflows
  }

  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <CardTitle className="text-xl mb-4">Workflow Runs</CardTitle>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issueWorkflows.map((workflow) => (
              <TableRow key={workflow.id}>
                <TableCell>
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
                      workflow.status === "completed"
                        ? "default"
                        : workflow.status === "error"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {workflow.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {workflow.lastEventTimestamp
                    ? formatDistanceToNow(workflow.lastEventTimestamp, {
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
