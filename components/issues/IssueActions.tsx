import AutoResolveIssueController from "@/components/issues/controllers/AutoResolveIssueController"
import { Button } from "@/components/ui/button"
import { GitHubIssue, WorkflowType } from "@/lib/types/github"
import { getRepoFullNameFromIssue } from "@/lib/utils/utils-common"

interface IssueActionsProps {
  issue: GitHubIssue
  isLoading: boolean
  activeWorkflow: WorkflowType | null
  onWorkflowStart: (workflow: WorkflowType) => void
  onWorkflowComplete: () => void
  onWorkflowError: () => void
}

export default function IssueActions({
  issue,
  isLoading,
  activeWorkflow,
  onWorkflowStart,
  onWorkflowComplete,
  onWorkflowError,
}: IssueActionsProps) {
  const repoFullName = getRepoFullNameFromIssue(issue)

  const { execute: executeAutoResolve } = AutoResolveIssueController({
    issueNumber: issue.number,
    repoFullName,
    onStart: () => {
      onWorkflowStart("Auto Resolving...")
    },
    onComplete: onWorkflowComplete,
    onError: onWorkflowError,
  })

  return (
    <div className="flex flex-col gap-6 mt-4">
      <div className="grid gap-6">
        <div className="border rounded-lg p-4 bg-muted/5">
          <div className="flex flex-col gap-3">
            <Button
              onClick={executeAutoResolve}
              disabled={isLoading}
              variant="default"
            >
              {activeWorkflow === "Auto Resolving..."
                ? "Running..."
                : "Auto Resolve Issue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

