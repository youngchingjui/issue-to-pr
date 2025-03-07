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
  traces: TraceWithDetails
}

// TODO: Show additional details, including # of observations, timestamp in friendly way, and connected issue or PR if any
// TODO: If in dev mode, add link to page on langfuse using process.env.LANGFUSE_BASEURL. example htmlPath: '/project/cm5eseyx20eoqcj50zgvcmed8/traces/fef4790b-d195-48b4-88c3-9e8045c500de'

export default async function WorkflowRunsList({
  traces,
}: WorkflowRunsListProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {traces.map((trace) => (
              <TableRow key={trace.id}>
                <TableCell>
                  <Link
                    href={`/workflow-runs/${trace.id}`}
                    className="font-medium hover:underline text-blue-600"
                  >
                    {trace.name || trace.id.slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell>
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
