"use client"

import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Task } from "@/lib/types"

interface TaskRowProps {
  task: Task
}

export default function TaskRow({ task }: TaskRowProps) {
  // Create a local URL to view the task details (not implemented yet)
  const localTaskUrl = "#" // Placeholder – could link to a future task page

  return (
    <TableRow className="sm:table-row flex flex-col sm:flex-row w-full bg-muted/50">
      {/* Title & meta */}
      <TableCell className="py-4 flex-1">
        <div className="flex flex-col gap-1">
          <div className="font-medium text-base break-words flex items-center gap-2">
            <Link href={localTaskUrl} className="hover:underline">
              {task.title ?? "(No title)"}
            </Link>
            <Badge variant="secondary">Task</Badge>
          </div>
          <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
            <span>{task.createdBy}</span>
            <span>•</span>
            <span>
              Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </TableCell>
      {/* Empty placeholder cells to align with IssueRow layout */}
      <TableCell className="text-center align-middle w-full sm:w-12 mb-2 sm:mb-0">
        {/* No plan / PR / workflow indicators for local tasks yet */}
      </TableCell>
      <TableCell className="text-right">
        {/* No workflow actions for tasks at the moment */}
      </TableCell>
    </TableRow>
  )
}
