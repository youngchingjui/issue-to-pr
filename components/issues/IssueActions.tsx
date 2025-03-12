import CreatePRController from "@/components/issues/controllers/CreatePRController"
import GenerateResolutionPlanController from "@/components/issues/controllers/GenerateResolutionPlanController"
import { Button } from "@/components/ui/button"
import { GitHubIssue, WorkflowType } from "@/lib/types/github"

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
  return (
    <div className="flex gap-4 mt-4">
      <Button
        onClick={() => {
          const controller = GenerateResolutionPlanController({
            issueNumber: issue.number,
            repoFullName: issue.repository.full_name,
            onStart: () => {
              onWorkflowStart("Generating Plan...")
            },
            onComplete: onWorkflowComplete,
            onError: onWorkflowError,
          })
          controller.execute()
        }}
        disabled={isLoading}
      >
        {activeWorkflow === "Generating Plan..."
          ? "Generating..."
          : "Generate Resolution Plan"}
      </Button>
      <Button
        onClick={() => {
          const controller = CreatePRController({
            issueNumber: issue.number,
            repoFullName: issue.repository.full_name,
            onStart: () => {
              onWorkflowStart("Creating PR...")
            },
            onComplete: onWorkflowComplete,
            onError: onWorkflowError,
          })
          controller.execute()
        }}
        disabled={isLoading}
      >
        {activeWorkflow === "Creating PR..."
          ? "Creating..."
          : "Fix Issue and Create PR"}
      </Button>
    </div>
  )
}
