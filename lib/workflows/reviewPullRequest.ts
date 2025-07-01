import { v4 as uuidv4 } from "uuid"

import { ReviewerAgent } from "@/lib/agents/reviewer"
import { createDirectoryTree } from "@/lib/fs"
import { getRepoFromString } from "@/lib/github/content"
import {
  getPullRequestComments,
  getPullRequestDiff,
  getPullRequestReviews,
} from "@/lib/github/pullRequests"
import { langfuse } from "@/lib/langfuse"
import {
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { createGetFileContentTool } from "@/lib/tools/GetFileContent"
import { createRipgrepSearchTool } from "@/lib/tools/RipgrepSearchTool"
import {
  GitHubIssue,
  IssueComment,
  PullRequestReview,
} from "@/lib/types/github"
import { setupLocalRepository } from "@/lib/utils/utils-server"

interface ReviewPullRequestParams {
  repoFullName: string
  issue?: GitHubIssue
  pullNumber?: number
  diff?: string
  baseDir?: string
  apiKey: string
  jobId?: string
}

export async function reviewPullRequest({
  repoFullName,
  issue,
  pullNumber,
  diff,
  baseDir,
  apiKey,
  jobId,
}: ReviewPullRequestParams) {
  const workflowId = jobId || uuidv4()

  try {
    // This workflow takes in a Pull Request or git diff
    // And also its associated issue
    // And uses and LLM to review the pull request
    // The LLM should assess at least some of the following:
    // - Which functions do these changes impact?
    // - What other files use these functions? Do they need to change?
    // - Digging deep into nested functions, what is the best way to incorporate all these changes? Is it by making changes at every step of the nesting? Or is there a more eloquent way to implement the overall goal (restate the issue).
    // - Are there changes here that don't belong to this PR? Ie they don't address the issue at hand? And should they be separated into a separate PR?
    // The LLM will be given tools to help it answer these questions
    // The final output should be the LLM's assessment of the pull request

    // Must provide either `pullNumber` or `diff`, but not both
    if (!pullNumber && !diff) {
      throw new Error("Must provide either `pullNumber` or `diff`")
    }

    if (pullNumber && diff) {
      throw new Error(
        "Must provide either `pullNumber` or `diff`, but not both"
      )
    }

    // Initialize workflow
    await initializeWorkflowRun({
      id: workflowId,
      type: "reviewPullRequest",
      issueNumber: issue?.number || undefined,
      repoFullName: repoFullName,
      postToGithub: false,
    })

    // Emit workflow start event
    await createWorkflowStateEvent({
      workflowId,
      state: "running",
    })

    // Start a trace for this workflow
    let traceName: string
    if (pullNumber) {
      traceName = `Review PR#${pullNumber}`
    } else if (issue) {
      traceName = `Review diff for #${issue.number} ${issue.title}`
    } else {
      traceName = `Review diff`
    }

    const trace = langfuse.trace({
      name: traceName,
      input: {
        repoFullName,
        issueNumber: issue?.number,
        pullNumber,
        diff,
      },
    })

    const span = trace.span({ name: traceName })

    // Initialize tools
    const getFileContentTool = createGetFileContentTool(baseDir || "")
    const searchCodeTool = createRipgrepSearchTool(repoFullName)

    // Initialize LLM
    const reviewer = new ReviewerAgent({ apiKey })
    await reviewer.addJobId(workflowId)
    reviewer.addSpan({ span, generationName: "Review pull request" })

    let finalDiff: string
    // Identify the diff
    if (pullNumber) {
      await createStatusEvent({
        workflowId,
        content: "Fetching PR diff",
      })

      finalDiff = await getPullRequestDiff({
        repoFullName,
        pullNumber,
      })
    } else if (diff) {
      finalDiff = diff
    } else {
      throw new Error("No diff provided")
    }

    let updatedBaseDir = baseDir
    if (!baseDir) {
      await createStatusEvent({
        workflowId,
        content: "Setting up local repository",
      })

      const repo = await getRepoFromString(repoFullName)
      updatedBaseDir = await setupLocalRepository({
        repoFullName,
        workingBranch: repo.default_branch,
      })
    }

    const tree = await createDirectoryTree(updatedBaseDir || "")

    // Fetch comments and reviews if pullNumber is provided
    let comments: IssueComment[] = []
    let reviews: PullRequestReview[] = []
    if (pullNumber) {
      comments = await getPullRequestComments({ repoFullName, pullNumber })
      reviews = await getPullRequestReviews({ repoFullName, pullNumber })
    }

    // Format comments and reviews
    const formattedComments = comments
      .map(
        (comment, index) =>
          `Comment ${index + 1} by ${comment.user?.login}:\n${comment.body}`
      )
      .join("\n\n")
    const formattedReviews = reviews
      .map(
        (review, index) =>
          `Review ${index + 1} by ${review.user?.login} (${review.state}):\n${review.body || "No comment provided"}`
      )
      .join("\n\n")

    // Provide initial user message with all necessary information
    const message = `
    ## Pull request diff\n
    ${finalDiff}\n
    ${
      issue
        ? `
    ## Github issue \n
      ### Title\n
      ${issue.title}\n
      ### Description\n
      ${issue.body}\n
    `
        : ""
    }
    ## Codebase directory\n
    ${tree.join("\n")}\n

    ${formattedComments ? `## Comments\n${formattedComments}\n` : ""}

    ${formattedReviews ? `## Reviews\n${formattedReviews}\n` : ""}
    `

    await reviewer.addMessage({
      role: "user",
      content: message,
    })

    // Attach tools to LLM
    reviewer.addTool(getFileContentTool)
    reviewer.addTool(searchCodeTool)

    // Run the LLM
    await createStatusEvent({
      workflowId,
      content: "Starting PR review analysis",
    })

    const response = await reviewer.runWithFunctions()

    // Emit completion event
    await createWorkflowStateEvent({
      workflowId,
      state: "completed",
    })

    return response
  } catch (error) {
    // End with error event
    await createWorkflowStateEvent({
      workflowId,
      state: "error",
      content: String(error),
    })

    throw error
  }
}
