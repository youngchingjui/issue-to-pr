// This workflow will coordinate all the agents to resolve the Github issue
// It will start with a coordinator agent, that will call other agents to figure out what to do
// All the agents will share the same trace
// They can also all access the same data, such as the issue, the codebase, etc.

import { CoordinatorAgent } from "@/lib/agents"
import { getLocalRepoDir } from "@/lib/fs"
import { Issue } from "@/lib/types"

import { getRepoFromString } from "../github/content"
import { langfuse } from "../langfuse"

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

  const agent = new CoordinatorAgent(
    issue,
    repository,
    trace,
    baseDir,
    repoName,
    apiKey
  )
  await agent.run()
}
