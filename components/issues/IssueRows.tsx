import IssueRow from "@/components/issues/IssueRow"
import PRStatusIndicator from "@/components/issues/PRStatusIndicator"
import type { IssueWithStatus } from "@/lib/github/issues"

interface Props {
  repoFullName: string
  issues: IssueWithStatus[]
  prMap: Record<number, number | null>
}

export default function IssueRows({ repoFullName, issues, prMap }: Props) {
  if (issues.length === 0) return null
  return (
    <>
      {issues.map((issue) => (
        <IssueRow
          key={`issue-${issue.id}`}
          issue={issue}
          repoFullName={repoFullName}
          prSlot={
            <PRStatusIndicator
              repoFullName={repoFullName}
              prNumber={prMap[issue.number]}
            />
          }
        />
      ))}
    </>
  )
}
