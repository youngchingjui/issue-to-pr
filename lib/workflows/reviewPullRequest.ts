import { ReviewerAgent } from "@/lib/agents/reviewer"
import { createDirectoryTree } from "@/lib/fs"
import {
  getPullRequestComments,
  getPullRequestDiff,
  getPullRequestReviews,
} from "@/lib/github/pullRequests"
import { langfuse } from "@/lib/langfuse"
import { SearchCodeTool } from "@/lib/tools"
import { GetFileContentTool } from "@/lib/tools"
import { GitHubIssue } from "@/lib/types"

import { getRepoFromString } from "../github/content"
import { setupLocalRepository } from "../utils-server"

interface ReviewPullRequestParams {
  repoFullName: string
  issue?: GitHubIssue
  pullNumber?: number
  diff?: string
  baseDir?: string
  apiKey: string
}

export async function reviewPullRequest({
  repoFullName,
  issue,
  pullNumber,
  diff,
  baseDir,
  apiKey,
}: ReviewPullRequestParams) {
  // This workflow takes in a Pull Request or git diff
  // And also its associated issue
  // And uses and LLM to review the pull request
  // The LLM should assess at least some of the following:
  // - Which functions do these changes impact?
  // - What other files use these functions? Do they need to change?
  // - Digging deep into nested functions, what is the best way to incorporate all these changes? Is it by making changes at every step of the nesting? Or is there a more eloquent way to implement the overall goal (restate the issue).
  // - Are there changes here that don't belong to this PR? Ie they don't address the issue at hand? And should they be separated into a separate PR?
  // - Identify and classify code sections based on organization quality. Provide feedback on complexity, redundancy, and separation of concerns.
  // The LLM will be given tools to help it answer these questions
  // The final output should be the LLM's assessment of the pull request

  // Must provide either `pullNumber` or `diff`, but not both
  if (!pullNumber && !diff) {
    throw new Error("Must provide either `pullNumber` or `diff`")
  }

  if (pullNumber && diff) {
    throw new Error("Must provide either `pullNumber` or `diff`, but not both")
  }

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
  const getFileContentTool = new GetFileContentTool(baseDir)
  const searchCodeTool = new SearchCodeTool(repoFullName)

  // Initialize LLM
  const reviewer = new ReviewerAgent({ apiKey })

  let finalDiff: string
  // Identify the diff
  if (pullNumber) {
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
    const repo = await getRepoFromString(repoFullName)
    updatedBaseDir = await setupLocalRepository({
      repoFullName,
      workingBranch: repo.default_branch,
    })
  }

  const tree = await createDirectoryTree(updatedBaseDir)

  // Fetch comments and reviews if pullNumber is provided
  let comments = []
  let reviews = []
  if (pullNumber) {
    comments = await getPullRequestComments({ repoFullName, pullNumber })
    reviews = await getPullRequestReviews({ repoFullName, pullNumber })
  }

  // Format comments and reviews
  const formattedComments = comments
    .map(
      (comment, index) =>
        `Comment ${index + 1} by ${comment.user.login}:
${comment.body}`
    )
    .join("\n\n")
  const formattedReviews = reviews
    .map(
      (review, index) =>
        `Review ${index + 1} by ${review.user.login} (${review.state}):
${review.body || "No comment provided"}`
    )
    .join("\n\n")

  // Provide initial user message with all necessary information
  const message = `
  ## Pull request diff
  ${finalDiff}
  ${
    issue
      ? `
  ## Github issue 
    ### Title
    ${issue.title}
    ### Description
    ${issue.body}
  `
      : ""
  }
  ## Codebase directory
  ${tree.join("\n")}

  ${formattedComments ? `## Comments
${formattedComments}
` : ""}

  ${formattedReviews ? `## Reviews
${formattedReviews}
` : ""}
  `

  reviewer.addMessage({
    role: "user",
    content: message,
  })

  // Attach tools to LLM
  reviewer.addTool(getFileContentTool)
  reviewer.addTool(searchCodeTool)

  // Attach span to LLM
  reviewer.addSpan({ span, generationName: "Review pull request" })

  // Run the LLM
  const response = await reviewer.runWithFunctions()

  // Extract and process LLM feedback specific to code organization
  if (response) {
    // Example: Extract details related to code complexity and provide structured feedback
    const organizationIssues = response.analysis?.organization || []
    organizationIssues.forEach(issue => {
      console.log("Organization Issue Detected:", issue.description)
      // Implement logic to handle detected issues, potentially refactor suggestions
    })
  }

  console.log("Response:", response)

  return response
}
