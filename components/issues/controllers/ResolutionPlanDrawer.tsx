"use client"

import { useCallback, useEffect, useMemo } from "react"

import GenerateResolutionPlanController from "@/components/issues/controllers/GenerateResolutionPlanController"
import { GitHubIssue } from "@/lib/types/github"
import { extractRepoFullNameFromIssue } from "@/lib/utils/utils-common"

interface ResolutionPlanDrawerProps {
  issue: GitHubIssue | null
  onComplete: () => void
  onError: (message: string) => void
}

function useResolutionPlanController(
  issue: GitHubIssue | null,
  onComplete: () => void,
  onError: (message: string) => void
) {
  return useMemo(() => {
    if (!issue) {
      return { drawer: null, execute: () => {} }
    }

    const repoFullName = extractRepoFullNameFromIssue(issue)
    if (!repoFullName) {
      const errorMessage = `Could not determine repository information for issue: ${issue.number}`
      console.error(errorMessage)
      onError(errorMessage)
      return { drawer: null, execute: () => {} }
    }

    return GenerateResolutionPlanController({
      issueNumber: issue.number,
      repoFullName,
      onStart: () => {
        // Drawer will be shown by the controller
      },
      onComplete,
      onError: () =>
        onError("Failed to generate resolution plan. Please try again."),
    })
  }, [issue, onComplete, onError])
}

export default function ResolutionPlanDrawer({
  issue,
  onComplete,
  onError,
}: ResolutionPlanDrawerProps) {
  const { drawer, execute } = useResolutionPlanController(
    issue,
    onComplete,
    onError
  )

  // Execute the plan when the component mounts and we have a valid issue
  useEffect(() => {
    if (issue) {
      execute()
    }
  }, [issue, execute])

  return drawer
}
