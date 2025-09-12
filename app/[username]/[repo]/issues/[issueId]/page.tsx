import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

import IssueDetailsWrapper from "@/components/issues/IssueDetailsWrapper"
import IssueWorkflowRuns from "@/components/issues/IssueWorkflowRuns"
import TableSkeleton from "@/components/layout/TableSkeleton"
import { Button } from "@/components/ui/button"
import { getIssue } from "@/lib/fetch/github/issues"
import { listWorkflowRuns } from "@/lib/neo4j/services/workflow"

interface Props {
  params: {
    username: string
    repo: string
    issueId: string
  }
}

export default async function IssueDetailsPage({ params }: Props) {
  const { username, repo, issueId } = params
  const repoFullName = `${username}/${repo}`
  const issueNumber = Number.parseInt(issueId, 10)

  const result = await getIssue(repoFullName, issueNumber)

  if (result.type === "not_found") {
    return (
      <main className="container mx-auto p-4">
        <div className="flex flex-col gap-4 max-w-2xl mx-auto items-center justify-center py-10">
          <h2 className="text-2xl font-bold text-red-500">Issue not found</h2>
          <p>
            The issue you are looking for does not exist. It may have been
            deleted, or the link is incorrect.
          </p>
          <Link href={`/${username}/${repo}/issues`}>
            <Button variant="secondary">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Issues
            </Button>
          </Link>
        </div>
      </main>
    )
  }
  if (result.type === "forbidden") {
    return (
      <main className="container mx-auto p-4">
        <div className="flex flex-col gap-4 max-w-2xl mx-auto items-center justify-center py-10">
          <h2 className="text-2xl font-bold text-red-500">Access denied</h2>
          <p>
            You do not have permission to view this issue. This may be a private
            or restricted repository.
          </p>
          <Link href={`/${username}/${repo}/issues`}>
            <Button variant="secondary">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Issues
            </Button>
          </Link>
        </div>
      </main>
    )
  }
  if (result.type === "other_error") {
    return (
      <main className="container mx-auto p-4">
        <div className="flex flex-col gap-4 max-w-2xl mx-auto items-center justify-center py-10">
          <h2 className="text-2xl font-bold text-red-500">
            Could not load this issue
          </h2>
          <p>
            Sorry, there was a problem loading this issue. Please try again
            later.
          </p>
          {typeof result.error === "string" ? (
            <p className="text-xs text-gray-500">{result.error}</p>
          ) : null}
          <Link href={`/${username}/${repo}/issues`}>
            <Button variant="secondary">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Issues
            </Button>
          </Link>
        </div>
      </main>
    )
  }

  // Success path: Render issue details
  const issue = result.issue
  const runs = await listWorkflowRuns({ repoFullName, issueNumber })

  return (
    <main className="container mx-auto p-4">
      <div className="flex flex-col gap-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href={`/${username}/${repo}/issues`}>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Issues
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            {repoFullName} - Issue #{issueNumber}
          </h1>
        </div>
        <Suspense fallback={<TableSkeleton />}>
          <IssueDetailsWrapper issue={issue} />
        </Suspense>

        <Suspense fallback={<TableSkeleton />}>
          <IssueWorkflowRuns
            repoFullName={repoFullName}
            issueNumber={issueNumber}
            initialRuns={runs}
          />
        </Suspense>
      </div>
    </main>
  )
}
