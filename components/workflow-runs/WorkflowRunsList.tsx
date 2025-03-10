"use server"

import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TraceWithDetails } from "@/lib/types/langfuse"

interface WorkflowRunsListProps {
  traces: TraceWithDetails[]
}

// TODO: Show additional details, including # of observations, timestamp in friendly way, and connected issue or PR if any
// TODO: If in dev mode, add link to page on langfuse using process.env.LANGFUSE_BASEURL. example htmlPath: '/project/cm5eseyx20eoqcj50zgvcmed8/traces/fef4790b-d195-48b4-88c3-9e8045c500de'

export default async function WorkflowRunsList({
  traces,
}: WorkflowRunsListProps) {
  return (
    <Card className="max-w-screen-xl mx-auto rounded">
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-4 text-base font-medium">Name</TableHead>
              <TableHead className="py-4 text-base font-medium">
                Started
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {traces.map((trace) => (
              <TableRow key={trace.id}>
                <TableCell className="py-4">
                  <Link
                    href={`/workflow-runs/${trace.id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {trace.name || trace.id.slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell className="py-4 text-muted-foreground">
                  {formatDistanceToNow(new Date(trace.timestamp), {
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
