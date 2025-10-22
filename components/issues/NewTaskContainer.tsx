import { Suspense } from "react"

import RepoSelector from "@/components/common/RepoSelector"
import IssueTable from "@/components/issues/IssueTable"
import NewTaskInput from "@/components/issues/NewTaskInput"
import SafariStreamingPaint from "@/components/system/SafariStreamingPaint"
import Skeleton from "@/components/ui/skeleton"
import { getRepoFromString } from "@/lib/github/content"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import { RepoFullName } from "@/lib/types/github"

import IssuesNotEnabled from "../common/IssuesNotEnabled"

interface Props {
  repoFullName: RepoFullName
}

/**
 * Shared layout for the main "task" experience: repository selection, new task
 * creation, and the issues/tasks table. This component is intentionally UI-only
 * so it can be reused by multiple pages without duplicating JSX.
 */
export default async function NewTaskContainer({ repoFullName }: Props) {
  const repo = await getRepoFromString(repoFullName.fullName)
  const issuesEnabled = !!repo.has_issues
  const existingKey = await getUserOpenAIApiKey()
  const hasOpenAIKey = !!(existingKey && existingKey.trim())

  return (
    <main className="mx-auto max-w-4xl w-full py-10 px-4 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">Your Issues &amp; Workflows</h1>
        <div className="flex items-center gap-3">
          <Suspense
            fallback={
              <>
                <SafariStreamingPaint />
                <Skeleton className="h-4 w-24" />
              </>
            }
          >
            <RepoSelector selectedRepo={repoFullName.fullName} />
          </Suspense>
        </div>
      </div>

      <Suspense
        fallback={
          <>
            <SafariStreamingPaint />
            <Skeleton className="h-9 w-60" />
          </>
        }
      >
        <IssuesNotEnabled repoFullName={repoFullName} />
      </Suspense>

      <div className="mb-6">
        <NewTaskInput
          repoFullName={repoFullName}
          issuesEnabled={issuesEnabled}
          hasOpenAIKey={hasOpenAIKey}
        />
      </div>

      <Suspense
        fallback={
          <>
            <SafariStreamingPaint />
            <Skeleton className="h-9 w-60" />
          </>
        }
      >
        <IssueTable repoFullName={repoFullName} />
      </Suspense>
    </main>
  )
}
