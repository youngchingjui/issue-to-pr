import BaseGitHubItemCard from "@/components/github/BaseGitHubItemCard"
import IssueActions from "@/components/issues/IssueActions"
import PRActions from "@/components/pull-requests/PRActions"
import { GitHubItem, WorkflowType } from "@/lib/types/github"

interface GitHubItemDetailsProps {
  item: GitHubItem
  isLoading: boolean
  activeWorkflow: WorkflowType | null
  onWorkflowStart: (workflow: WorkflowType) => void
  onWorkflowComplete: () => void
  onWorkflowError: () => void
}

export default function GitHubItemDetails(props: GitHubItemDetailsProps) {
  const {
    item,
    isLoading,
    activeWorkflow,
    onWorkflowStart,
    onWorkflowComplete,
    onWorkflowError,
  } = props

  return (
    <BaseGitHubItemCard item={item}>
      {item.type === "issue" ? (
        <IssueActions
          issue={item}
          isLoading={isLoading}
          activeWorkflow={activeWorkflow}
          onWorkflowStart={onWorkflowStart}
          onWorkflowComplete={onWorkflowComplete}
          onWorkflowError={onWorkflowError}
        />
      ) : (
        <PRActions
          pr={item}
          isLoading={isLoading}
          activeWorkflow={activeWorkflow}
          onWorkflowStart={onWorkflowStart}
          onWorkflowComplete={onWorkflowComplete}
          onWorkflowError={onWorkflowError}
        />
      )}
    </BaseGitHubItemCard>
  )
}
