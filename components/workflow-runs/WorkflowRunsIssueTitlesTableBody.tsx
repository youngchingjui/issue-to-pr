import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { TableBody, TableCell, TableRow } from "@/components/ui/table"
import { makeIssueReaderAdapter } from "@/shared/adapters/github/octokit/graphql/issue.reader"
import { fetchIssueTitles } from "@/shared/services/github/issues"

export type WorkflowRunItem = {
  id: string
  state: string
  createdAt?: Date | number | string | null
  type?: string | null
  issue?: {
    repoFullName: string
    number: number
    title?: string | null
  } | null
}

export function TableBodyFallback({
  workflows,
}: {
  workflows: WorkflowRunItem[]
}) {
  return (
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
              ? formatDistanceToNow(workflow.createdAt as Date | number, {
                  addSuffix: true,
                })
              : "N/A"}
          </TableCell>
          <TableCell className="py-4">
            {workflow.issue ? (
              <div className="animate-pulse space-y-2">
                <div className="h-3 w-3/4 rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
              </div>
            ) : (
              <span className="text-zinc-400">N/A</span>
            )}
          </TableCell>
          <TableCell className="py-4">{workflow.type}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  )
}

export async function IssueTitlesTableBody({
  workflows,
  token,
}: {
  workflows: WorkflowRunItem[]
  token?: string
}) {
  let issueTitleMap = new Map<string, string | null>()
  try {
    const refs = workflows
      .filter((w) => !!w.issue)
      .map((w) => ({
        repoFullName: w.issue!.repoFullName,
        number: w.issue!.number,
      }))

    if (refs.length > 0 && token) {
      const adapter = makeIssueReaderAdapter({ token })
      const results = await fetchIssueTitles(adapter, refs)
      issueTitleMap = new Map(
        results.map((r) => [`${r.repoFullName}#${r.number}`, r.title])
      )
    }
  } catch (err) {
    console.error("[WorkflowRunsPage] Failed to fetch issue titles:", err)
  }

  return (
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
              ? formatDistanceToNow(workflow.createdAt as Date | number, {
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
  )
}
