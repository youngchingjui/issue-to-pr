"use server"

import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

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
import { WorkflowEvent } from "@/lib/types/workflow"

interface WorkflowRunsListProps {
  workflows?: {
    id: string
    events: WorkflowEvent[]
    status: "active" | "completed" | "error"
    lastEventTimestamp?: Date | null
  }[]
}

// TODO: Show additional details, including # of observations, timestamp in friendly way, and connected issue or PR if any
// TODO: If in dev mode, add link to page on langfuse using process.env.LANGFUSE_BASEURL. example htmlPath: '/project/cm5eseyx20eoqcj50zgvcmed8/traces/fef4790b-d195-48b4-88c3-9e8045c500de'

export default async function WorkflowRunsList({
  workflows = [],
}: WorkflowRunsListProps) {
  // Sort workflows by lastEventTimestamp in descending order
  const sortedWorkflows = [...workflows].sort((a, b) => {
    const timeA = a.lastEventTimestamp?.getTime() ?? 0
    const timeB = b.lastEventTimestamp?.getTime() ?? 0
    return timeB - timeA
  })

  return (
    <Card className="max-w-screen-xl mx-auto rounded">
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-4 text-base font-medium">Name</TableHead>
              <TableHead className="py-4 text-base font-medium">
                Status
              </TableHead>
              <TableHead className="py-4 text-base font-medium">
                Started
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedWorkflows.map((workflow) => (
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
                <TableCell className="py-4 text-muted-foreground">
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
