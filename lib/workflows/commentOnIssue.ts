import { ThinkerAgent } from "@/lib/agents/thinker"
import { AUTH_CONFIG } from "@/lib/auth/config"
import { createDirectoryTree } from "@/lib/fs"
import {
  createIssueComment,
  getIssue,
  updateIssueComment,
} from "@/lib/github/issues"
import { langfuse } from "@/lib/langfuse"
import { WorkflowEmitter, WorkflowStage } from "@/lib/services/WorkflowEmitter"
import { SearchCodeTool } from "@/lib/tools"
import GetFileContentTool from "@/lib/tools/GetFileContent"
import { GitHubRepository } from "@/lib/types/github"
import { setupLocalRepository } from "@/lib/utils/utils-server"

const COMMENT_WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: "auth",
    name: "Authentication",
    description: "Authenticating and retrieving token",
  },
  {
    id: "issue_retrieval",
    name: "Issue Retrieval",
    description: "Retrieving issue details",
  },
  {
    id: "initial_comment",
    name: "Initial Comment",
    description: "Posting initial processing comment",
  },
  {
    id: "repo_setup",
    name: "Repository Setup",
    description: "Setting up local repository",
  },
  {
    id: "analysis",
    name: "Analysis",
    description: "Analyzing issue and generating response",
  },
  {
    id: "comment_update",
    name: "Comment Update",
    description: "Updating comment with final response",
  },
]

interface GitHubError extends Error {
  status?: number
  response?: {
    data?: {
      message?: string
    }
  }
}

export default async function commentOnIssue(
  issueNumber: number,
  repo: GitHubRepository,
  apiKey: string,
  jobId: string
) {
  const trace = langfuse.trace({ name: "commentOnIssue" })
  let initialCommentId: number | null = null

  // Initialize workflow
  await WorkflowEmitter.initWorkflow(jobId, COMMENT_WORKFLOW_STAGES)

  try {
    // Authentication stage
    await WorkflowEmitter.startStage(jobId, "auth")

    // Get the issue
    await WorkflowEmitter.startStage(jobId, "issue_retrieval")
    const issue = await getIssue({
      fullName: repo.full_name,
      issueNumber,
    }).catch((error: GitHubError) => {
      console.error("Failed to get issue:", {
        status: error.status,
        message: error.message,
        responseData: error.response?.data,
      })
      throw new Error(
        `Failed to get issue #${issueNumber}: ${error.response?.data?.message || error.message}`
      )
    })
    await WorkflowEmitter.completeStage(jobId, "issue_retrieval")

    // Post initial comment
    await WorkflowEmitter.startStage(jobId, "initial_comment")
    try {
      const initialComment = await createIssueComment({
        issueNumber,
        repoFullName: repo.full_name,
        comment: "[Issue To PR] Generating plan...please wait a minute.",
      })
      initialCommentId = initialComment.id
      await WorkflowEmitter.completeStage(jobId, "initial_comment")
    } catch (error) {
      const githubError = error as GitHubError
      console.error("Failed to create initial comment:", {
        status: githubError.status,
        message: githubError.message,
        responseData: githubError.response?.data,
        authMethod: AUTH_CONFIG.getCurrentProvider(),
        repo: repo.full_name,
        issueNumber,
      })

      if (githubError.status === 403) {
        const isIntegrationError =
          githubError.response?.data?.message?.includes(
            "not accessible by integration"
          )
        if (isIntegrationError && AUTH_CONFIG.isUsingOAuth()) {
          throw new Error(
            "Permission denied: You don't have write access to this repository. " +
              "Please ensure you have the necessary permissions to comment on this issue."
          )
        }
        throw new Error(
          "Permission denied: Unable to comment on this issue. Please check if you have write access to this repository."
        )
      } else if (githubError.status === 404) {
        throw new Error(
          "Issue or repository not found. Please check if the issue exists and you have access to it."
        )
      }
      throw new Error(
        `Failed to create comment: ${githubError.response?.data?.message || githubError.message}`
      )
    }

    // Setup repository
    await WorkflowEmitter.startStage(jobId, "repo_setup")
    const dirPath = await setupLocalRepository({
      repoFullName: repo.full_name,
      workingBranch: repo.default_branch,
    }).catch((error) => {
      console.error("Failed to setup local repository:", {
        error,
        repo: repo.full_name,
      })
      throw new Error(`Failed to setup local repository: ${error.message}`)
    })
    await WorkflowEmitter.completeStage(jobId, "repo_setup")

    const tree = await createDirectoryTree(dirPath)

    // Analysis stage
    await WorkflowEmitter.startStage(jobId, "analysis")

    // Prepare the tools
    const getFileContentTool = new GetFileContentTool(dirPath)
    const searchCodeTool = new SearchCodeTool(repo.full_name)

    // Create the thinker agent
    const thinker = new ThinkerAgent({ issue, apiKey, tree })
    const span = trace.span({ name: "generateComment" })
    thinker.addSpan({ span, generationName: "commentOnIssue" })
    thinker.addTool(getFileContentTool)
    thinker.addTool(searchCodeTool)
    thinker.addJobId(jobId)

    // Track analysis progress
    let analysisProgress = 0
    const progressInterval = setInterval(async () => {
      if (analysisProgress < 90) {
        analysisProgress += 10
        await WorkflowEmitter.updateStageProgress(
          jobId,
          "analysis",
          analysisProgress
        )
      }
    }, 2000)

    // Use streaming version
    const response = await thinker.runWithFunctionsStream()
    clearInterval(progressInterval)
    await WorkflowEmitter.updateStageProgress(jobId, "analysis", 100)
    await WorkflowEmitter.completeStage(jobId, "analysis")
    span.end()

    // Update comment
    await WorkflowEmitter.startStage(jobId, "comment_update")
    if (initialCommentId) {
      await updateIssueComment({
        repoFullName: repo.full_name,
        commentId: initialCommentId,
        comment: response,
      }).catch((error) => {
        console.error("Failed to update comment:", {
          error,
          commentId: initialCommentId,
          repo: repo.full_name,
        })
        throw new Error(`Failed to update comment: ${error.message}`)
      })
    }
    await WorkflowEmitter.completeStage(jobId, "comment_update")

    // Return the comment
    return { status: "complete", issueComment: response }
  } catch (error) {
    const githubError = error as GitHubError
    console.error("Error in commentOnIssue workflow:", {
      error: githubError,
      issueNumber,
      repo: repo.full_name,
      jobId,
    })

    const errorMessage =
      githubError.response?.data?.message ||
      githubError.message ||
      "An unknown error occurred"

    if (initialCommentId) {
      try {
        await updateIssueComment({
          repoFullName: repo.full_name,
          commentId: initialCommentId,
          comment: `[Issue to PR] Failed to generate a plan for this issue:\n\n\`\`\`\n${errorMessage}\n\`\`\``,
        })
      } catch (updateError) {
        console.error("Failed to update error message in comment:", {
          originalError: githubError,
          updateError,
          commentId: initialCommentId,
        })
      }
    }

    // Mark current stage as failed
    const currentStage = (await WorkflowEmitter.getWorkflowState(jobId))
      ?.currentStageId
    if (currentStage) {
      await WorkflowEmitter.completeStage(jobId, currentStage, errorMessage)
    }

    throw githubError
  }
}
