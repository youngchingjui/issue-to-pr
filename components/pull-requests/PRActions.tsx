import IdentifyPRGoalController from "@/components/pull-requests/controllers/IdentifyPRGoalController"
import ReviewPRController from "@/components/pull-requests/controllers/ReviewPRController"
import { Button } from "@/components/ui/button"
import { GitHubIssue, WorkflowType } from "@/lib/types/github"
import { getRepoFullNameFromIssue } from "@/lib/utils/utils-common"

interface PRActionsProps {
  pr: GitHubIssue
  isLoading: boolean
  activeWorkflow: WorkflowType | null
  onWorkflowStart: (workflow: WorkflowType) => void
  onWorkflowComplete: () => void
  onWorkflowError: () => void
}

export default function PRActions({
  pr,
  isLoading,
  activeWorkflow,
  onWorkflowStart,
  onWorkflowComplete,
  onWorkflowError,
}: PRActionsProps) {
  const repoFullName = getRepoFullNameFromIssue(pr)
  return (
    <div className="flex gap-4 mt-4">
      <Button
        onClick={() => {
          const controller = ReviewPRController({
            repoFullName: repoFullName.fullName,
            pullNumber: pr.number,
            onStart: () => {
              onWorkflowStart("Reviewing PR...")
            },
            onComplete: onWorkflowComplete,
            onError: onWorkflowError,
          })
          controller.execute()
        }}
        disabled={isLoading}
      >
        {activeWorkflow === "Reviewing PR..."
          ? "Reviewing..."
          : "Review Pull Request"}
      </Button>
      <Button
        onClick={() => {
          const controller = IdentifyPRGoalController({
            repoFullName: repoFullName.fullName,
            pullNumber: pr.number,
            onStart: () => {
              onWorkflowStart("Identifying Goal...")
            },
            onComplete: onWorkflowComplete,
            onError: onWorkflowError,
          })
          controller.execute()
        }}
        disabled={isLoading}
      >
        {activeWorkflow === "Identifying Goal..."
          ? "Identifying..."
          : "Identify PR Goal"}
      </Button>
    </div>
  )
}
