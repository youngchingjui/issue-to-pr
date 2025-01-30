// This workflow will coordinate all the agents to resolve the Github issue
// It will start with a coordinator agent, that will call other agents to figure out what to do
// All the agents will share the same trace
// They can also all access the same data, such as the issue, the codebase, etc.

import { auth } from "@/auth"
import { CoordinatorAgent } from "@/lib/agents/coordinator"
import { createDirectoryTree, getLocalRepoDir } from "@/lib/fs"
import {
  checkIfGitExists,
  checkoutBranch,
  cloneRepo,
  stash,
  updateToLatest,
  addWorktree,
  removeWorktree
} from "@/lib/git"
import { langfuse } from "@/lib/langfuse"
import {
  CallCoderAgentTool,
  GetFileContentTool,
  UploadAndPRTool,
} from "@/lib/tools"
import { GitHubRepository, Issue } from "@/lib/types"
import { getCloneUrlWithAccessToken } from "@/lib/utils"

export const resolveIssue = async (
  issue: Issue,
  repository: GitHubRepository,
  apiKey: string
) => {
  // Get or create a local directory to work off of
  const baseDir = await getLocalRepoDir(repository.full_name)

  // Create an isolated environment using git worktrees
  const worktreeDir = `${baseDir}-wt-${issue.id}`; // Unique worktree directory for the issue
  await addWorktree(baseDir, worktreeDir, issue.branch_name); // Add worktree for the branch

  try {
    // Check if .git and codebase exist in worktreeDir
    console.debug(`[DEBUG] Checking if .git and codebase exist in ${worktreeDir}`)
    const gitExists = await checkIfGitExists(worktreeDir)
    if (!gitExists) {
      // Clone the repo into the worktree directory if not exists
      console.debug(`[DEBUG] Cloning repo: ${repository.full_name}`)

      const session = await auth()
      const token = session.user?.accessToken
      // Attach access token to cloneUrl
      const cloneUrlWithToken = getCloneUrlWithAccessToken(
        repository.full_name,
        token
      )

      await cloneRepo(cloneUrlWithToken, worktreeDir)
    }

    // Clear away any untracked files and checkout the branch
    // And git pull to latest
    await stash(worktreeDir)
    await checkoutBranch(repository.default_branch, worktreeDir)
    await updateToLatest(worktreeDir)

    // Start a trace for this workflow
    const trace = langfuse.trace({
      name: "Resolve issue",
    })
    const span = trace.span({ name: "coordinate" })

    const tree = await createDirectoryTree(worktreeDir)

    // Load all the tools
    const callCoderAgentTool = new CallCoderAgentTool({ apiKey, worktreeDir })
    const getFileContentTool = new GetFileContentTool(worktreeDir)
    const submitPRTool = new UploadAndPRTool(repository, worktreeDir)

    // Prepare the coordinator agent
    const coordinatorAgent = new CoordinatorAgent({
      issue,
      apiKey,
      repo: repository,
      tree,
    })
    coordinatorAgent.addSpan({ span, generationName: "coordinate" })

    // Add tools for coordinator agent
    coordinatorAgent.addTool(getFileContentTool)
    coordinatorAgent.addTool(callCoderAgentTool) // Coordinator will pass off work to coder and wait for response
    coordinatorAgent.addTool(submitPRTool)

    return await coordinatorAgent.runWithFunctions()
  } finally {
    // Clean up the worktree after the workflow completes
    await removeWorktree(worktreeDir);
  }
}
