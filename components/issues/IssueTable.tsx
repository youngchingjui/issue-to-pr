import IssueRow from "@/components/issues/IssueRow"
import { getRepoFromString } from "@/lib/github/content"
import { getIssueList } from "@/lib/github/issues"

export default async function IssueTable({
  repoFullName,
}: {
  repoFullName: string
}) {
  try {
    const issues = await getIssueList({
      repoFullName,
      per_page: 100,
    })
    const repo = await getRepoFromString(repoFullName)

    if (issues.length === 0) {
      return <p className="text-center py-4">No open issues found.</p>
    }

    return (
      <div className="bg-white border border-gray-300">
        <div className="flex bg-gray-100 py-2 px-4">
          <div className="flex-1 font-bold">Issue</div>
          <div className="flex-1 font-bold">Status</div>
          <div className="flex-1 font-bold">Comment</div>
          <div className="flex-1 font-bold">Actions</div>
        </div>
        <div>
          {issues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} repo={repo} />
          ))}
        </div>
      </div>
    )
  } catch (error) {
    return (
      <p className="text-center py-4 text-red-500">
        Error: {(error as Error).message}
      </p>
    )
  }
}
