"use server"

import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Suspense } from "react"
import { ExternalLink, Loader2 } from "lucide-react"

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
import { listWorkflowRuns, getWorkflowRunWithDetails } from "@/lib/neo4j/services/workflow"

interface Props {
  repoFullName: string
  issueNumber: number
}

// Helper: extract plan info if present
function findPlanFromEvents(events: any[]): { planId: string, planEventId: string } | null {
  for (const e of events) {
    if (e.type === "llmResponseWithPlan" && e.plan?.id) {
      return { planId: e.plan.id, planEventId: e.id }
    }
  }
  return null
}

// Helper: extract PR info from toolCallResult events for createPR
function findPRFromEvents(events: any[]): { prNumber: string, prUrl: string } | null {
  for (const e of events) {
    if (e.type === "toolCallResult" && e.toolName?.toLowerCase() === "createpr") {
      // Try to extract PR URL from e.content
      // (Assume e.content contains the PR url or number in plain text, e.g. "Created PR: https://github.com/owner/repo/pull/123")
      const prUrlRegex = /(https:\/\/github.com\/[\w-]+\/[\w-]+\/pull\/[0-9]+)/i
      const urlMatch = e.content && prUrlRegex.exec(e.content)
      if (urlMatch) {
        return { prUrl: urlMatch[1], prNumber: urlMatch[1].split("/").pop() || "" }
      }
    }
  }
  return null
}

export default async function IssueWorkflowRuns({
  repoFullName,
  issueNumber,
}: Props) {
  // The base list, just workflow runs meta (type, state, etc)
  const runs = await listWorkflowRuns({ repoFullName, issueNumber })
  if (runs.length === 0) {
    return null // Don't show anything if no workflows
  }

  // For each run, prefetch details and mine for planId/prUrl links
  // SSR: Do this in parallel so it's not n+1 slow for small lists
  const runsWithDetails = await Promise.all(
    runs.map(async (run) => {
      // getWorkflowRunWithDetails: {workflow, events, issue}
      const details = await getWorkflowRunWithDetails(run.id)
      // Find plan/pr info
      let planLink: string | null = null
      let prLink: string | null = null
      let planId: string | null = null
      let prNumber: string | null = null
      let extra: any = {}
      if (details.workflow.type === "commentOnIssue") {
        const plan = findPlanFromEvents(details.events)
        if (plan) {
          planId = plan.planId
          // issueNumber is available at this level
          planLink = `/${repoFullName}/issues/${issueNumber}/plan/${planId}`
          extra.planEventId = plan.planEventId
        }
      } else if (details.workflow.type === "resolveIssue") {
        const pr = findPRFromEvents(details.events)
        if (pr) {
          prLink = pr.prUrl
          prNumber = pr.prNumber
        }
      }
      return {
        ...run,
        planLink,
        planId,
        prLink,
        prNumber,
        events: details.events,
        ...extra,
      }
    })
  )

  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <CardTitle className="text-xl mb-4">Workflow Runs</CardTitle>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>PR</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runsWithDetails.map((run) => (
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
                <TableCell>{run.type}</TableCell>
                <TableCell>
                  {run.planLink ? (
                    <Link
                      href={run.planLink}
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View Plan <ExternalLink className="inline h-4 w-4" />
                    </Link>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {run.prLink ? (
                    <a
                      href={run.prLink}
                      className="text-blue-600 hover:underline flex items-center gap-1"
                      target="_blank" rel="noopener noreferrer"
                    >
                      View PR <ExternalLink className="inline h-4 w-4" />
                    </a>
                  ) : (
                    "-"
                  )}
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
