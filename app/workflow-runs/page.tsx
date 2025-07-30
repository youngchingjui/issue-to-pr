import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Suspense } from "react"

import TableSkeleton from "@/components/layout/TableSkeleton"
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
import { listUserRepositories } from "@/lib/github/graphql/queries/listUserRepositories"
import { listWorkflowRuns } from "@/lib/neo4j/services/workflow"

/**
 * Filter workflow runs so that only runs which belong to repositories the
 * current user can access are shown. Visibility of *public* repositories is
 * already handled by GitHub – they will appear in listUserRepositories() even
 * for users who are not collaborators. Private repositories will only be
 * returned if the user has permission.
 */
async function getPermittedWorkflowRuns() {
  // Fetch all runs first (they are inexpensive; filtering happens in memory)
  const allRuns = await listWorkflowRuns()

  try {
    const repos = await listUserRepositories()
    const allowed = new Set(repos.map((r) => r.nameWithOwner))

    return allRuns.filter((run) => {
      // Runs that are not linked to a repository issue are considered internal
      // and are therefore hidden from the general listing for security.
      if (!run.issue) return false
      return allowed.has(run.issue.repoFullName)
    })
  } catch (err) {
    // If we fail to retrieve the accessible repositories (likely because the
    // user is not authenticated), we return an empty array instead of leaking
    // information.
    console.error("[WorkflowRunsPage] Failed to list user repositories", err)
    return []
  }
}

export default async function WorkflowRunsPage() {
  const workflows = await getPermittedWorkflowRuns()

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Workflow Runs</h1>
      <Suspense fallback={<TableSkeleton />}>
        <Card className="max-w-screen-xl mx-auto rounded">
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-4 text-base font-medium">
                    Run ID
                  </TableHead>
                  <TableHead className="py-4 text-base font-medium">
                    Status
                  </TableHead>
                  <TableHead className="py-4 text-base font-medium">
                    Started
                  </TableHead>
                  <TableHead className="py-4 text-base font-medium">
                    Issue
                  </TableHead>
                  <TableHead className="py-4 text-base font-medium">
                    Workflow Type
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow) => (
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
                          workflow.state === "completed"
                            ? "default"
                            : workflow.state === "error"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {workflow.state}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-muted-foreground">
                      {workflow.createdAt
                        ? formatDistanceToNow(workflow.createdAt, {
                            addSuffix: true,
                          })
                        : "N/A"}
                    </TableCell>
                    <TableCell className="py-4">
                      {workflow.issue ? (
                        <Link
                          href={`/${workflow.issue.repoFullName}/issues/${workflow.issue.number}`}
                          className="text-blue-700 hover:underline"
                        >
                          {workflow.issue.repoFullName}#{workflow.issue.number}
                        </Link>
                      ) : (
                        <span className="text-zinc-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">{workflow.type}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Suspense>
    </main>
  )
}

