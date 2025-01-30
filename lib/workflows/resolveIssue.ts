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

  // Check if .git and codebase exist in tempDir
  // If not, clone the repo

  console.debug(`[DEBUG] Checking if .git and codebase exist in ${baseDir}`)
  const gitExists = await checkIfGitExists(baseDir)
  if (!gitExists) {
    // Clone the repo
    console.debug(`[DEBUG] Cloning repo: ${repository.full_name}`)

    const session = await auth()
    const token = session.user?.accessToken
    // Attach access token to cloneUrl
    const cloneUrlWithToken = getCloneUrlWithAccessToken(
      repository.full_name,
      token
    )

    await cloneRepo(cloneUrlWithToken, baseDir)
  }

  // Clear away any untracked files and checkout the branch
  // And git pull to latest
  await stash(baseDir)
  await checkoutBranch(repository.default_branch, baseDir)
  await updateToLatest(baseDir)

  // Start a trace for this workflow
  const trace = langfuse.trace({
    name: "Resolve issue",
  })
  const span = trace.span({ name: "coordinate" })

  const tree = await createDirectoryTree(baseDir)

  // Load all the tools
  const callCoderAgentTool = new CallCoderAgentTool({ apiKey, baseDir })
  const getFileContentTool = new GetFileContentTool(baseDir)
  const submitPRTool = new UploadAndPRTool(repository, baseDir)

  // Prepare the coordinator agent
  const coordinatorAgent = new CoordinatorAgent({
    issue,
    apiKey,
    repo: repository,
    tree,
  })
  coordinatorAgent.addSpan({ span, generationName: "coordinate" })

  // Add tools for coordinator agen
  coordinatorAgent.addTool(getFileContentTool)
  coordinatorAgent.addTool(callCoderAgentTool) // Coordinator will pass off work to coder and wait for response
  coordinatorAgent.addTool(submitPRTool)

  return await coordinatorAgent.runWithFunctions()
}
