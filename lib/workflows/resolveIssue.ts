// This workflow will coordinate all the agents to resolve the Github issue
// It will start with a coordinator agent, that will call other agents to figure out what to do
// All the agents will share the same trace
// They can also all access the same data, such as the issue, the codebase, etc.

import { CoordinatorAgent } from "@/lib/agents/coordinator"
import { createDirectoryTree } from "@/lib/fs"
import { getIssueComments } from "@/lib/github/issues"
import { langfuse } from "@/lib/langfuse"
import {
  CallCoderAgentTool,
  GetFileContentTool,
  ReviewPullRequestTool,
  SearchCodeTool,
  UploadAndPRTool,
} from "@/lib/tools"
import { GitHubIssue, GitHubRepository } from "@/lib/types"
import { setupLocalRepository } from "@/lib/utils-server"

export const resolveIssue = async (
  issue: GitHubIssue,
  repository: GitHubRepository,
  apiKey: string
) => {
  // Setup local repoistory
  const baseDir = await setupLocalRepository({
    repoFullName: repository.full_name,
    workingBranch: repository.default_branch,
  })

  // Start a trace for this workflow
  const trace = langfuse.trace({
    name: "Resolve issue",
  })
  const span = trace.span({ name: "coordinate" })

  // Generate a directory tree of the codebase
  const tree = await createDirectoryTree(baseDir)

  // Retrieve all the comments on the issue
  const comments = await getIssueComments({
    repo: repository.name,
    issueNumber: issue.number,
  })

  // Load all the tools
  const callCoderAgentTool = new CallCoderAgentTool({ apiKey, baseDir })
  const getFileContentTool = new GetFileContentTool(baseDir)
  const submitPRTool = new UploadAndPRTool(repository, baseDir, issue.number)
  const searchCodeTool = new SearchCodeTool(repository.full_name)
  const reviewPullRequestTool = new ReviewPullRequestTool({
    repo: repository,
    issue,
    baseDir,
    apiKey,
  })

  // Prepare the coordinator agent
  const coordinatorAgent = new CoordinatorAgent({
    issue,
    apiKey,
    repo: repository,
    tree,
    comments,
  })
  coordinatorAgent.addSpan({ span, generationName: "coordinate" })

  // Add tools for coordinator agen
  coordinatorAgent.addTool(getFileContentTool)
  coordinatorAgent.addTool(callCoderAgentTool)
  coordinatorAgent.addTool(submitPRTool)
  coordinatorAgent.addTool(searchCodeTool)
  coordinatorAgent.addTool(reviewPullRequestTool)
  return await coordinatorAgent.runWithFunctions()
}
