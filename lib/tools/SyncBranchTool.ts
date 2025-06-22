import { z } from "zod"

import { pushBranch } from "@/lib/git"
import { checkBranchExists } from "@/lib/github/content"
import { BranchCreationStatus, createBranch } from "@/lib/github/git"
import { createTool } from "@/lib/tools/helper"
import { RepoFullName } from "@/lib/types"

const syncBranchParameters = z.object({
  branch: z
    .string()
    .describe(
      "The name of the branch to push to remote. If not provided, pushes the current branch."
    ),
})

type SyncBranchParams = z.infer<typeof syncBranchParameters>

async function fnHandler(
  repoFullName: RepoFullName,
  baseDir: string,
  params: SyncBranchParams,
  token: string
): Promise<string> {
  const { branch } = params
  try {
    // Create branch on remote if it doesn't exist
    const branchExists = await checkBranchExists(repoFullName.fullName, branch)
    if (!branchExists) {
      const branchCreationResult = await createBranch(
        repoFullName.fullName,
        branch
      )
      if (
        branchCreationResult.status === BranchCreationStatus.BranchAlreadyExists
      ) {
        return JSON.stringify({
          status: "error",
          message: branchCreationResult.message,
        })
      }
    }
    // Push the current branch to remote, requiring token
    await pushBranch(branch, baseDir, token, repoFullName.fullName)
    return JSON.stringify({
      status: "success",
      message: `Successfully pushed branch '${branch}' to remote`,
    })
  } catch (error: unknown) {
    return JSON.stringify({
      status: "error",
      message: `Failed to push branch to remote: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}

export const createSyncBranchTool = (
  repoFullName: RepoFullName,
  baseDir: string,
  token: string
) =>
  createTool({
    name: "sync_branch_to_remote",
    description:
      "Pushes the current branch and its commits to the remote GitHub repository. Similar to 'git push origin HEAD'. Will create the remote branch if it doesn't exist.",
    schema: syncBranchParameters,
    handler: (params: SyncBranchParams) =>
      fnHandler(repoFullName, baseDir, params, token),
  })
