import { z } from "zod"

import { execInContainer } from "@/lib/docker"
import { pushBranch } from "@/lib/git"
import { checkBranchExists } from "@/lib/github/content"
import { BranchCreationStatus, createBranch } from "@/lib/github/git"
import { createTool } from "@/lib/tools/helper"
import { asRepoEnvironment, RepoEnvironment, Tool } from "@/lib/types"
import { RepoFullName } from "@/lib/types/github"
import { getCloneUrlWithAccessToken } from "@/lib/utils/utils-common"

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
  env: RepoEnvironment,
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
    if (env.kind === "host") {
      await pushBranch(branch, env.root, token, repoFullName.fullName)
    } else {
      // Ensure the 'origin' remote embeds authentication
      const authenticatedUrl = getCloneUrlWithAccessToken(
        repoFullName.fullName,
        token
      )

      // Set remote URL with credentials before pushing
      const { exitCode: setUrlExit, stderr: setUrlErr } = await execInContainer(
        {
          name: env.name,
          command: `git remote set-url origin "${authenticatedUrl}"`,
        }
      )
      if (setUrlExit !== 0) {
        return JSON.stringify({
          status: "error",
          message: `Failed to set authenticated remote: ${setUrlErr}`,
        })
      }

      const { exitCode, stderr } = await execInContainer({
        name: env.name,
        command: `git push origin ${branch}`,
      })
      if (exitCode !== 0) {
        return JSON.stringify({
          status: "error",
          message: `Failed to push branch to remote: ${stderr}`,
        })
      }
    }
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

// Overloaded function signatures for backwards compatibility
/**
 * @deprecated Use dockerized version with `env: RepoEnvironment` params instead
 */
export function createSyncBranchTool(
  repoFullName: RepoFullName,
  baseDir: string,
  token: string
): Tool<typeof syncBranchParameters, string>
export function createSyncBranchTool(
  repoFullName: RepoFullName,
  env: RepoEnvironment,
  token: string
): Tool<typeof syncBranchParameters, string>
export function createSyncBranchTool(
  repoFullName: RepoFullName,
  arg: string | RepoEnvironment,
  token: string
): Tool<typeof syncBranchParameters, string> {
  const env = asRepoEnvironment(arg)
  return createTool({
    name: "sync_branch_to_remote",
    description:
      "Pushes the current branch and its commits to the remote GitHub repository. Similar to 'git push origin HEAD'. Will create the remote branch if it doesn't exist.",
    schema: syncBranchParameters,
    handler: (params: SyncBranchParams) =>
      fnHandler(repoFullName, env, params, token),
  })
}
