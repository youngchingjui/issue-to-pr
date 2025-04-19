import { zodFunction } from "openai/helpers/zod"
import { z } from "zod"

import { pushBranch } from "@/lib/git"
import { checkBranchExists } from "@/lib/github/content"
import { BranchCreationStatus, createBranch } from "@/lib/github/git"
import { Tool } from "@/lib/types"
import { RepoFullName } from "@/lib/types/github"

const syncBranchParameters = z.object({
  branch: z
    .string()
    .describe(
      "The name of the branch to push to remote. If not provided, pushes the current branch."
    ),
})

class SyncBranchTool implements Tool<typeof syncBranchParameters> {
  repoFullName: RepoFullName
  baseDir: string

  constructor(repoFullName: RepoFullName, baseDir: string) {
    this.repoFullName = repoFullName
    this.baseDir = baseDir
  }

  parameters = syncBranchParameters
  tool = zodFunction({
    name: "sync_branch_to_remote",
    parameters: syncBranchParameters,
    description:
      "Pushes the current branch and its commits to the remote GitHub repository. Similar to 'git push origin HEAD'. Will create the remote branch if it doesn't exist.",
  })

  async handler(params: z.infer<typeof syncBranchParameters>) {
    const { branch } = params

    try {
      // Create branch on remote if it doesn't exist
      const branchExists = await checkBranchExists(this.repoFullName, branch)
      if (!branchExists) {
        const branchCreationResult = await createBranch(
          this.repoFullName,
          branch
        )
        if (
          branchCreationResult.status ===
          BranchCreationStatus.BranchAlreadyExists
        ) {
          return JSON.stringify({
            status: "error",
            message: branchCreationResult.message,
          })
        }
      }

      // Push the current branch to remote
      await pushBranch(branch, this.baseDir)

      return JSON.stringify({
        status: "success",
        message: `Successfully pushed branch '${branch}' to remote`,
      })
    } catch (error) {
      return JSON.stringify({
        status: "error",
        message: `Failed to push branch to remote: ${error.message || error}`,
      })
    }
  }
}

export default SyncBranchTool
