import { ThinkerAgent } from "@/lib/agents/thinker"
import { AUTH_CONFIG } from "@/lib/auth/config"
import { createDirectoryTree } from "@/lib/fs"
import {
  createIssueComment,
  getIssue,
  updateIssueComment,
} from "@/lib/github/issues"
import { langfuse } from "@/lib/langfuse"
import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"
import { SearchCodeTool } from "@/lib/tools"
import GetFileContentTool from "@/lib/tools/GetFileContent"
import { GitHubRepository } from "@/lib/types/github"
import { setupLocalRepository } from "@/lib/utils/utils-server"

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
  const persistenceService = new WorkflowPersistenceService()

  try {
    await persistenceService.saveEvent({
      type: "status",
      workflowId: jobId,
      data: { status: "Authenticating and retrieving token" },
      timestamp: new Date(),
    })

    // Get the issue
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

    await persistenceService.saveEvent({
      type: "status",
      workflowId: jobId,
      data: { status: "Issue retrieved successfully" },
      timestamp: new Date(),
    })

    // Post initial comment indicating processing start
    await persistenceService.saveEvent({
      type: "status",
      workflowId: jobId,
      data: { status: "Posting initial processing comment" },
      timestamp: new Date(),
    })

    try {
      const initialComment = await createIssueComment({
        issueNumber,
        repoFullName: repo.full_name,
        comment: "[Issue To PR] Generating plan...please wait a minute.",
      })
      initialCommentId = initialComment.id
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

    await persistenceService.saveEvent({
      type: "status",
      workflowId: jobId,
      data: { status: "Setting up the local repository" },
      timestamp: new Date(),
    })

    // Setup local repository using setupLocalRepository
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

    await persistenceService.saveEvent({
      type: "status",
      workflowId: jobId,
      data: { status: "Repository setup completed" },
      timestamp: new Date(),
    })

    const tree = await createDirectoryTree(dirPath)
    await persistenceService.saveEvent({
      type: "status",
      workflowId: jobId,
      data: { status: "Directory tree created" },
      timestamp: new Date(),
    })

    // Prepare the tools
    const getFileContentTool = new GetFileContentTool(dirPath)
    const searchCodeTool = new SearchCodeTool(repo.full_name)

    // Create and initialize the thinker agent
    const thinker = new ThinkerAgent({ apiKey })
    thinker.addJobId(jobId) // Set jobId before any messages are added
    const span = trace.span({ name: "generateComment" })
    thinker.addSpan({ span, generationName: "commentOnIssue" })
    thinker.addTool(getFileContentTool)
    thinker.addTool(searchCodeTool)

    // Add issue information as user message
    await thinker.addMessage({
      role: "user",
      content: `Github issue title: ${issue.title}\nGithub issue description: ${issue.body}`,
    })

    // Add tree information as user message
    if (tree && tree.length > 0) {
      await thinker.addMessage({
        role: "user",
        content: `Here is the codebase's tree directory:\n${tree.join("\n")}`,
      })
    }

    await persistenceService.saveEvent({
      type: "status",
      workflowId: jobId,
      data: { status: "Generating comment" },
      timestamp: new Date(),
    })

    const response = await thinker.runWithFunctions()
    span.end()

    await persistenceService.saveEvent({
      type: "status",
      workflowId: jobId,
      data: { status: "Updating initial comment with final response" },
      timestamp: new Date(),
    })

    // Update the initial comment with the final response
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

    await persistenceService.saveEvent({
      type: "status",
      workflowId: jobId,
      data: { status: "Comment updated successfully" },
      timestamp: new Date(),
    })

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

    await persistenceService.saveEvent({
      type: "error",
      workflowId: jobId,
      data: { error: errorMessage },
      timestamp: new Date(),
    })

    throw githubError // Re-throw the error to be handled by the caller
  }
}
