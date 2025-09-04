import IssueRow from "@/components/issues/IssueRow"
import PRStatusIndicator from "@/components/issues/PRStatusIndicator"
import PreviewDeploymentIndicator from "@/components/issues/PreviewDeploymentIndicator"
import {
  getIssueListWithStatus,
  getLinkedPRNumbersForIssues,
  getPreviewLinksForPRs,
} from "@/lib/github/issues"
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

  const issueNumbers = issues.map((i) => i.number)
  const prMap = await getLinkedPRNumbersForIssues({
    repoFullName: repoFullName.fullName,
    issueNumbers,
  })

  const previewMap = await getPreviewLinksForPRs({
    repoFullName: repoFullName.fullName,
    prNumbersByIssue: prMap,
  })

  return (
    <>
      {issues.map((issue) => (
        <IssueRow
          key={`issue-${issue.id}`}
          issue={issue}
          repoFullName={repoFullName.fullName}
          prSlot={
            <PRStatusIndicator
              repoFullName={repoFullName.fullName}
              prNumber={prMap[issue.number]}
            />
          }
          previewSlot={
            <PreviewDeploymentIndicator previewUrl={previewMap[issue.number]} />
          }
        />
      ))}
    </>
  )
}

