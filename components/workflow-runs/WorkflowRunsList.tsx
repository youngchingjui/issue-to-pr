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
import { getStatusVariant, getTraceStatus } from "@/lib/langfuse/helpers"
import { WorkflowEvent } from "@/lib/services/WorkflowPersistenceService"
import { TraceWithDetails } from "@/lib/types/langfuse"

interface WorkflowRunsListProps {
  traces: TraceWithDetails[]
  neoWorkflows?: {
    id: string
    events: WorkflowEvent[]
    status: "active" | "completed" | "error"
    lastEventTimestamp: Date | null
  }[]
}

// TODO: Show additional details, including # of observations, timestamp in friendly way, and connected issue or PR if any
// TODO: If in dev mode, add link to page on langfuse using process.env.LANGFUSE_BASEURL. example htmlPath: '/project/cm5eseyx20eoqcj50zgvcmed8/traces/fef4790b-d195-48b4-88c3-9e8045c500de'

export default async function WorkflowRunsList({
  traces,
  neoWorkflows = [],
}: WorkflowRunsListProps) {
  // Combine and sort both types of workflows
  type CombinedWorkflow = {
    id: string
    name: string | null
    source: "langfuse" | "graph"
    status: "active" | "completed" | "error"
    timestamp: Date
    href: string
  }

  const combinedWorkflows: CombinedWorkflow[] = [
    ...traces.map((trace) => ({
      id: trace.id,
      name: trace.name || null,
      source: "langfuse" as const,
      status: getTraceStatus(trace),
      timestamp: new Date(trace.timestamp),
      href: `/workflow-runs/${trace.id}`,
    })),
    ...neoWorkflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.events[0]?.data?.name?.toString() || null,
      source: "graph" as const,
      status: workflow.status,
      timestamp: workflow.lastEventTimestamp || new Date(0), // Use epoch if no timestamp
      href: `/workflow-runs/${workflow.id}`,
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) // Sort by most recent first

  return (
    <Card className="max-w-screen-xl mx-auto rounded">
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-4 text-base font-medium">Name</TableHead>
              <TableHead className="py-4 text-base font-medium">
                Source
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
            {combinedWorkflows.map((workflow) => (
              <TableRow key={workflow.id}>
                <TableCell className="py-4">
                  <Link
                    href={workflow.href}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {workflow.name || workflow.id.slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      workflow.source === "langfuse" ? "secondary" : "outline"
                    }
                  >
                    {workflow.source === "langfuse" ? "Langfuse" : "Graph"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(workflow.status)}>
                    {workflow.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-4 text-muted-foreground">
                  {formatDistanceToNow(workflow.timestamp, {
                    addSuffix: true,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
