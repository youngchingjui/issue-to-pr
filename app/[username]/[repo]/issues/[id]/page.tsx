import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import IssueDetailsWrapper from "@/components/issues/IssueDetailsWrapper"
import TableSkeleton from "@/components/layout/TableSkeleton"
import { Button } from "@/components/ui/button"
import { getIssue } from "@/lib/github/issues"
import { GitHubIssue } from "@/lib/types/github"

interface Props {
  params: {
    username: string
    repo: string
    id: string
  }
}

export default async function IssueDetailsPage({ params }: Props) {
  const { username, repo, id } = params
  const repoFullName = `${username}/${repo}`
  const issueNumber = parseInt(id)

  let issue: GitHubIssue
  try {
    issue = await getIssue({
      fullName: repoFullName,
      issueNumber,
    })
  } catch (error) {
    console.error("Error fetching issue:", error)
    notFound()
  }

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
      </div>
    </main>
  )
}
