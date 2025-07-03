import BaseGitHubItemCard from "@/components/github/BaseGitHubItemCard"
import IssueActions from "@/components/issues/IssueActions"
import PRActions from "@/components/pull-requests/PRActions"
import MarkdownRenderer from "@/components/blog/MarkdownRenderer"
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
      {/* Issue body/description, only for issues */}
      {item.type === "issue" && (
        item.body && item.body.trim() ? (
          <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg bg-muted p-4">
            <MarkdownRenderer content={item.body} />
          </div>
        ) : (
          <div className="italic text-muted-foreground mb-4">No description provided.</div>
        )
      )}
      {/* Actions section */}
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
