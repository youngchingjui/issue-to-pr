"use client"

import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useEffect, useState } from "react"
import useSWR from "swr"
import { backOff } from "exponential-backoff"

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
import { WorkflowRunState } from "@/lib/types"

interface WorkflowRun {
  id: string
  state: WorkflowRunState
  createdAt: Date | null
}

interface Props {
  repoFullName: string
  issueNumber: number
  initialRuns: WorkflowRun[]
  poll: boolean
}

const fetcher = async (url: string): Promise<WorkflowRun[]> => {
  const result = await backOff(async () => {
    const res = await fetch(url)
    if (!res.ok) throw new Error("Failed to fetch")
    const json = await res.json()
    return json.runs as WorkflowRun[]
  })
  return result
}

export default function IssueWorkflowRunsClient({
  repoFullName,
  issueNumber,
  initialRuns,
  poll,
}: Props) {
  const [interval, setInterval] = useState(poll ? 1000 : 0)
  const { data } = useSWR(
    poll
      ? `/api/workflow-runs?repo=${encodeURIComponent(
          repoFullName
        )}&issue=${issueNumber}`
      : null,
    fetcher,
    {
      refreshInterval: interval,
      keepPreviousData: true,
    }
  )

  const runs = data ?? initialRuns

  useEffect(() => {
    if (!data) return
    const active = data.some(
      (r) => r.state !== "completed" && r.state !== "error"
    )
    if (active) {
      setInterval((i) => Math.min(i * 2 || 1000, 30000))
    } else {
      setInterval(0)
    }
  }, [data])

  if (runs.length === 0) {
    return null
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
                    ? formatDistanceToNow(new Date(run.createdAt), {
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
