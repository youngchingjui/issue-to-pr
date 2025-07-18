"use client"

import { formatDistanceToNow } from "date-fns"
import { backOff } from "exponential-backoff"
import Link from "next/link"
import { useEffect, useState } from "react"
import useSWR from "swr"

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
import { WorkflowRunState, WorkflowType } from "@/lib/types"

interface WorkflowRun {
  id: string
  state: WorkflowRunState
  createdAt: Date | null
  type: WorkflowType
}

interface Props {
  repoFullName: string
  issueNumber: number
  initialRuns: WorkflowRun[]
}

const fetcher = async (url: string) => {
  const result = await backOff(async () => {
    const res = await fetch(url)
    if (!res.ok) throw new Error("Failed to fetch")
    return res.json()
  })
  return result
}

export default function IssueWorkflowRuns({
  repoFullName,
  issueNumber,
  initialRuns,
}: Props) {
  const [latestPlanId, setLatestPlanId] = useState<string | null>(null)
  const [prNumber, setPrNumber] = useState<number | null>(null)

  // ---- Fetch latest plan id ----
  useEffect(() => {
    const loadPlan = async () => {
      try {
        const res = await fetch(
          `/api/issues/${issueNumber}/plan/latest?repo=${encodeURIComponent(repoFullName)}`
        )
        if (!res.ok) return
        const json = await res.json()
        setLatestPlanId(json.planId)
      } catch (err) {
        /* noop */
      }
    }
    loadPlan()
  }, [repoFullName, issueNumber])

  // ---- Fetch PR number linked to issue ----
  useEffect(() => {
    const loadPR = async () => {
      try {
        const res = await fetch(
          `/api/issues/${issueNumber}/pullRequest?repo=${encodeURIComponent(repoFullName)}`
        )
        if (!res.ok) return
        const json = await res.json()
        setPrNumber(json.prNumber)
      } catch (_) {}
    }
    loadPR()
  }, [repoFullName, issueNumber])

  // Determine if we should poll based on run states
  const shouldPoll = (runs: WorkflowRun[]) =>
    runs.some((r) => r.state !== "completed" && r.state !== "error")

  const { data } = useSWR(
    `/api/workflow-runs?repo=${encodeURIComponent(repoFullName)}&issue=${issueNumber}`,
    async (url) => {
      const json = await fetcher(url)
      // The API returns date strings – convert createdAt to Date
      return (json.runs as WorkflowRun[]).map((r) => ({
        ...r,
        createdAt: r.createdAt ? new Date(r.createdAt) : null,
      }))
    },
    {
      refreshInterval: (current) => {
        const runs = current ?? initialRuns
        return shouldPoll(runs) ? 2000 : 0
      },
      keepPreviousData: true,
    }
  )

  const runs = data ?? initialRuns

  if (!runs || runs.length === 0) return null

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
              <TableHead>Type</TableHead>
              <TableHead>Artifacts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => {
              const planLink =
                run.type === "commentOnIssue" && latestPlanId
                  ? `/${repoFullName}/issues/${issueNumber}/plan/${latestPlanId}`
                  : null
              const prLink =
                run.type === "resolveIssue" && prNumber
                  ? `https://github.com/${repoFullName}/pull/${prNumber}`
                  : null
              return (
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
                  <TableCell>{run.type}</TableCell>
                  <TableCell className="space-x-3">
                    {planLink && (
                      <Link
                        href={planLink}
                        className="text-blue-600 hover:underline"
                      >
                        Plan
                      </Link>
                    )}
                    {prLink && (
                      <a
                        href={prLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        PR #{prNumber}
                      </a>
                    )}
                    {!planLink && !prLink && (
                      <span className="text-zinc-400">–</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

