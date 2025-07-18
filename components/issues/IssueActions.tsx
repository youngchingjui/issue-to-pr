import { useState } from "react"

import BranchSelector from "@/components/common/BranchSelector"
import AutoResolveIssueController from "@/components/issues/controllers/AutoResolveIssueController"
import CreatePRController from "@/components/issues/controllers/CreatePRController"
import GenerateResolutionPlanController from "@/components/issues/controllers/GenerateResolutionPlanController"
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

  // Branch selector state – default to "main" (will be updated by selector when data loads)
  const [selectedRef, setSelectedRef] = useState("main")

  const { execute: executeAutoResolve } = AutoResolveIssueController({
    issueNumber: issue.number,
    repoFullName,
    onStart: () => {
      onWorkflowStart("Auto Resolving...")
    },
    onComplete: onWorkflowComplete,
    onError: onWorkflowError,
  })

  const { execute: executePlan, ToggleControl: PlanToggleControl } =
    GenerateResolutionPlanController({
      issueNumber: issue.number,
      repoFullName: repoFullName.fullName,
      onStart: () => {
        onWorkflowStart("Generating Plan...")
      },
      onComplete: onWorkflowComplete,
      onError: onWorkflowError,
    })

  const { execute: executePR, ToggleControl: PRToggleControl } =
    CreatePRController({
      issueNumber: issue.number,
      repoFullName: repoFullName.fullName,
      onStart: () => {
        onWorkflowStart("Creating PR...")
      },
      onComplete: onWorkflowComplete,
      onError: onWorkflowError,
    })

  return (
    <div className="flex flex-col gap-6 mt-4">
      <BranchSelector
        repoFullName={repoFullName}
        value={selectedRef}
        onChange={setSelectedRef}
      />

      <div className="grid gap-6">
        {/* Generate Plan */}
        <div className="border rounded-lg p-4 bg-muted/5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <Button
                onClick={executePlan}
                disabled={isLoading}
                variant="default"
              >
                {activeWorkflow === "Generating Plan..."
                  ? "Generating..."
                  : "Generate Resolution Plan"}
              </Button>
              <PlanToggleControl />
            </div>
          </div>
        </div>

        {/* Fix Issue & Create PR */}
        <div className="border rounded-lg p-4 bg-muted/5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <Button
                onClick={executePR}
                disabled={isLoading}
                variant="default"
              >
                {activeWorkflow === "Creating PR..."
                  ? "Creating..."
                  : "Fix Issue and Create PR"}
              </Button>
              <PRToggleControl />
            </div>
          </div>
        </div>

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
