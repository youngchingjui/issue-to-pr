import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Suspense } from "react"

import { auth } from "@/auth"
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
import {
  fetchIssueTitles,
  GitHubGraphQLAdapter,
  TimedGitHubIssuesPort,
  withTiming,
} from "@/shared/src"

/**
 * Filter workflow runs so that only runs which belong to repositories the
 * current user can access are shown. Visibility of *public* repositories is
 * already handled by GitHub – they will appear in listUserRepositories() even
 * for users who are not collaborators. Private repositories will only be
 * returned if the user has permission.
 */
async function getPermittedWorkflowRuns() {
  const allRunsPromise = withTiming("Neo4j READ: listWorkflowRuns (page)", () =>
    listWorkflowRuns()
  )
  const reposPromise = withTiming(
    "GitHub GraphQL: listUserRepositories (page)",
    () => listUserRepositories()
  )
  const [allRuns, repos] = await withTiming(
    "Parallel fetch: workflow runs + repos",
    () => Promise.all([allRunsPromise, reposPromise])
  )

  try {
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
  return await withTiming("Render: WorkflowRunsPage", async () => {
    const runsPromise = withTiming("getPermittedWorkflowRuns()", () =>
      getPermittedWorkflowRuns()
    )
    const authPromise = withTiming("NextAuth: auth()", () => auth())
    const [workflows, session] = await withTiming(
      "Parallel fetch: permitted runs + auth",
      () => Promise.all([runsPromise, authPromise])
    )

    // Best-effort: fetch latest titles from GitHub for linked issues
    let issueTitleMap = new Map<string, string | null>()
    try {
      const refs = workflows
        .filter((w) => !!w.issue)
        .map((w) => ({
          repoFullName: w.issue!.repoFullName,
          number: w.issue!.number,
        }))

      const token =
        typeof session?.token === "object" &&
        session?.token &&
        "access_token" in session.token
          ? String((session.token as Record<string, unknown>)["access_token"])
          : undefined

      if (refs.length > 0 && token) {
        const baseAdapter = new GitHubGraphQLAdapter({ token })
        const adapter = new TimedGitHubIssuesPort(baseAdapter)
        const results = await fetchIssueTitles(adapter, refs)
        issueTitleMap = new Map(
          results.map((r) => [`${r.repoFullName}#${r.number}`, r.title])
        )
      }
    } catch (err) {
      // Missing token or GitHub failure – silently ignore and fall back to stored titles
      console.error("[WorkflowRunsPage] Failed to fetch issue titles:", err)
    }

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
                          <a
                            href={`https://github.com/${workflow.issue.repoFullName}/issues/${workflow.issue.number}`}
                            className="text-blue-700 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {(() => {
                              const key = `${workflow.issue!.repoFullName}#${workflow.issue!.number}`
                              const fetched = issueTitleMap.get(key)
                              const title = fetched ?? workflow.issue!.title
                              return title
                                ? `#${workflow.issue!.number} ${title}`
                                : `${workflow.issue!.repoFullName}#${workflow.issue!.number}`
                            })()}
                          </a>
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
  })
}
