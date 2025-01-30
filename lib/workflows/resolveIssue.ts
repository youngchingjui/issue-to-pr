// This workflow will coordinate all the agents to resolve the Github issue
// It will start with a coordinator agent, that will call other agents to figure out what to do
// All the agents will share the same trace
// They can also all access the same data, such as the issue, the codebase, etc.

import { createDirectoryTree, getLocalRepoDir } from "@/lib/fs"
import { Issue } from "@/lib/types"

import { CoordinatorAgent } from "../agents/coordinator"
import { getRepoFromString } from "../github/content"
import { langfuse } from "../langfuse"
import GetFileContentTool from "../tools/GetFileContent"

export const resolveIssue = async (
  issue: Issue,
  repoName: string,
  apiKey: string
) => {
  // Get or create a local directory to work off of
  const repository = await getRepoFromString(repoName)
  const baseDir = await getLocalRepoDir(repository.full_name)

  // Start a trace for this workflow
  const trace = langfuse.trace({
    name: "Resolve issue",
  })
  const span = trace.span({ name: "coordinate" })

  const tree = await createDirectoryTree(baseDir)

  // Load all the tools
  const callCoderAgentTool = new CallCoderAgentTool()
  const getFileContentTool = new GetFileContentTool()

  // Prepare the coordinator agent
  const coordinatorAgent = new CoordinatorAgent({
    issue,
    apiKey,
    repo: repository,
    tree,
  })
  coordinatorAgent.addSpan({ span, generationName: "coordinate" })

  // Add tools for coordinator agent

  // Prepare the coder agent
  const coderAgent = new CoderAgent()

  callCoderAgentTool.attachCoderAgent(coderAgent)
  coordinatorAgent.addTool(callCoderAgentTool) // Coordinator will pass off work to coder and wait for response

  coordinatorAgent.addTool(getFileContentTool)

  return await coordinatorAgent.runWithFunctions()
}
