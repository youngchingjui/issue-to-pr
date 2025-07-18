import { ThinkerAgent } from "@/lib/agents/thinker"
import { AUTH_CONFIG } from "@/lib/auth/config"
import { isContainerRunning } from "@/lib/docker"
import {
  createIssueComment,
  getIssue,
  updateIssueComment,
} from "@/lib/github/issues"
import { langfuse } from "@/lib/langfuse"
import {
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { tagMessageAsPlan } from "@/lib/neo4j/services/plan"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { createContainerExecTool } from "@/lib/tools/ContainerExecTool"
import { createGetFileContentTool } from "@/lib/tools/GetFileContent"
import { createRipgrepSearchTool } from "@/lib/tools/RipgrepSearchTool"
import { BaseEvent as appBaseEvent, RepoEnvironment } from "@/lib/types"
import { AGENT_BASE_IMAGE } from "@/lib/types/docker"
import { GitHubRepository } from "@/lib/types/github"
import {
  createContainerizedDirectoryTree,
  createContainerizedWorkspace,
} from "@/lib/utils/container"
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
  jobId: string,
  postToGithub: boolean = false
) {
  const trace = langfuse.trace({ name: "commentOnIssue" })
  let initialCommentId: number | null = null

  let latestEvent: appBaseEvent | null = null
  let containerCleanup: (() => Promise<void>) | null = null

  try {
    await initializeWorkflowRun({
      id: jobId,
      type: "commentOnIssue",
      issueNumber,
      repoFullName: repo.full_name,
      postToGithub,
    })

    latestEvent = await createWorkflowStateEvent({
      workflowId: jobId,
      state: "running",
    })

    latestEvent = await createStatusEvent({
      content: "Authenticating and retrieving token",
      workflowId: jobId,
    })

    // Get the issue
    const issueResult = await getIssue({
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

    if (issueResult.type !== "success") {
      throw new Error(JSON.stringify(issueResult))
    }

    latestEvent = await createStatusEvent({
      content: "Issue retrieved successfully",
      workflowId: jobId,
      parentId: latestEvent.id,
    })

    // Only post to GitHub if postToGithub is true
    if (postToGithub) {
      latestEvent = await createStatusEvent({
        content: "Posting initial processing comment",
        workflowId: jobId,
        parentId: latestEvent.id,
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
    }

    latestEvent = await createStatusEvent({
      content: "Setting up containerized environment",
      workflowId: jobId,
      parentId: latestEvent.id,
    })

    // Ensure local repository exists and is up-to-date
    const hostRepoPath = await setupLocalRepository({
      repoFullName: repo.full_name,
      workingBranch: repo.default_branch,
    })

    // Setup containerized workspace environment, copying from host path
    const { containerName, cleanup } = await createContainerizedWorkspace({
      repoFullName: repo.full_name,
      branch: repo.default_branch,
      workflowId: jobId,
      image: AGENT_BASE_IMAGE,
      hostRepoPath,
    }).catch((error) => {
      console.error("Failed to setup containerized environment:", {
        error,
        repo: repo.full_name,
      })
      throw new Error(
        `Failed to setup containerized environment: ${error.message}`
      )
    })

    containerCleanup = cleanup

    const running = await isContainerRunning(containerName)
    if (!running) {
      throw new Error(`Container ${containerName} failed to start`)
    }

    latestEvent = await createStatusEvent({
      content: "Container environment ready",
      workflowId: jobId,
      parentId: latestEvent.id,
    })

    // Build directory tree using containerized version of createDirectoryTree
    const tree = await createContainerizedDirectoryTree(containerName)

    // Prepare the environment and tools for container execution
    const env: RepoEnvironment = { kind: "container", name: containerName }
    const getFileContentTool = createGetFileContentTool(env)
    const searchCodeTool = createRipgrepSearchTool(env)
    const containerExecTool = createContainerExecTool(containerName)

    latestEvent = await createStatusEvent({
      content: "Beginning to review issue and codebase",
      workflowId: jobId,
      parentId: latestEvent.id,
    })

    // Create and initialize the thinker agent
    const thinker = new ThinkerAgent({ apiKey, model: "o3" })

    await thinker.addJobId(jobId) // Set jobId before any messages are added

    const span = trace.span({ name: "generateComment" })
    thinker.addSpan({ span, generationName: "commentOnIssue" })

    thinker.addTool(getFileContentTool)
    thinker.addTool(searchCodeTool)
    thinker.addTool(containerExecTool)

    const issue = issueResult.issue
    // Add issue information as user message
    await thinker.addMessage({
      role: "user",
      content: `Github issue title: ${issue.title}\nGithub issue description: ${issue.body}`,
    })

    // Add tree information as user message
    if (tree && tree.length > 0) {
      await thinker.addMessage({
        role: "user",
        content: `Here is the codebase's file structure:\n${tree.join("\n")}`,
      })
    }

    const response = await thinker.runWithFunctions()

    span.end()

    const lastAssistantMessage = response.messages
      .filter(
        (msg) =>
          msg.role === "assistant" &&
          typeof msg.content === "string" &&
          !msg.tool_calls
      )
      .pop()

    if (!lastAssistantMessage) {
      throw new Error(
        "No valid assistant message found in the response: " +
          JSON.stringify(response.messages)
      )
    }

    if (!lastAssistantMessage.id) {
      throw new Error(
        "No message id found in the last assistant message: " +
          JSON.stringify(lastAssistantMessage)
      )
    }

    // The response is the final Plan.
    await tagMessageAsPlan({
      eventId: lastAssistantMessage.id,
      workflowId: jobId,
      issueNumber: issueNumber,
      repoFullName: repo.full_name,
    })

    // Only update GitHub comment if postToGithub is true
    if (postToGithub && initialCommentId) {
      latestEvent = await createStatusEvent({
        content: "Updating initial comment with final response",
        workflowId: jobId,
        parentId: latestEvent.id,
      })

      if (typeof lastAssistantMessage.content !== "string") {
        throw new Error(
          `Last message content is not a string. Here's the content: ${JSON.stringify(
            lastAssistantMessage.content
          )}`
        )
      }

      await updateIssueComment({
        repoFullName: repo.full_name,
        commentId: initialCommentId,
        comment: lastAssistantMessage.content,
      }).catch((error) => {
        console.error("Failed to update comment:", {
          error,
          commentId: initialCommentId,
          repo: repo.full_name,
        })
        throw new Error(`Failed to update comment: ${error.message}`)
      })

      await createStatusEvent({
        content: "Comment updated successfully",
        workflowId: jobId,
        parentId: latestEvent.id,
      })
    }

    await createWorkflowStateEvent({
      workflowId: jobId,
      state: "completed",
    })

    // Return the comment plus planId for downstream consumption
    return {
      status: "complete",
      issueComment: response,
      planId: lastAssistantMessage.id,
    }
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

    await createWorkflowStateEvent({
      workflowId: jobId,
      state: "error",
      content: errorMessage,
    })

    throw githubError // Re-throw the error to be handled by the caller
  } finally {
    // Always cleanup the containerized environment
    if (containerCleanup) {
      await containerCleanup()
    }
  }
}
