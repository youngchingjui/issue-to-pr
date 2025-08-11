import IssueRow from "@/components/issues/IssueRow"
import { getIssueListWithStatus } from "@/lib/github/issues"
import { RepoFullName } from "@/lib/types/github"

interface Props {
  repoFullName: RepoFullName
}

export default async function IssueRows({ repoFullName }: Props) {
  const issues = await getIssueListWithStatus({
    repoFullName: repoFullName.fullName,
    per_page: 25,
  })

  if (issues.length === 0) return null

  return (
    <>
      {issues.map((issue) => (
        <IssueRow
          key={`issue-${issue.id}`}
          issue={issue}
          repoFullName={repoFullName.fullName}
        />
      ))}
    </>
  )
}

