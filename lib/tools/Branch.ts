import { z } from "zod"

import { execInContainer } from "@/lib/docker"
import {
  checkIfLocalBranchExists,
  checkoutBranchQuietly,
  createBranch,
} from "@/lib/git"
import { createTool } from "@/lib/tools/helper"
import { asRepoEnvironment, RepoEnvironment, Tool } from "@/lib/types"
import { shellEscape } from "@/lib/utils/cli"

const branchParameters = z.object({
  branch: z.string().describe("The name of the branch to create or checkout"),
  createIfNotExists: z
    .boolean()
    .nullable()
    .describe(
      "Whether to create the branch if it doesn'\''t exist. Defaults to false."
    ),
})

type BranchParams = z.infer<typeof branchParameters>

async function fnHandler(
  env: RepoEnvironment,
  params: BranchParams
): Promise<string> {
  const { branch, createIfNotExists = false } = params
  try {
    if (env.kind === "host") {
      const exists = await checkIfLocalBranchExists(branch, env.root)
      if (!exists && !createIfNotExists) {
        return JSON.stringify({
          status: "error",
          message: `Branch '\''${branch}'\'' does not exist. Set createIfNotExists to true to create it.`,
        })
      }
      if (!exists) {
        try {
          await createBranch(branch, env.root)
          return JSON.stringify({
            status: "success",
            message: `Created and checked out branch '\''${branch}'\''`,
            created: true,
          })
        } catch (error: unknown) {
          return JSON.stringify({
            status: "error",
            message: `Failed to create branch '\''${branch}'\'': ${error instanceof Error ? error.message : String(error)}`,
          })
        }
      } else {
        try {
          await checkoutBranchQuietly(branch, env.root)
          return JSON.stringify({
            status: "success",
            message: `Checked out existing branch '\''${branch}'\''`,
            created: false,
          })
        } catch (error: unknown) {
          return JSON.stringify({
            status: "error",
            message: `Failed to checkout branch '\''${branch}'\'': ${error instanceof Error ? error.message : String(error)}`,
          })
        }
      }
    } else {
      const exec = async (cmd: string) =>
        execInContainer({ name: env.name, command: cmd })

      const { stdout: branchList } = await exec(`git branch --list ${shellEscape(branch)}`)
      const exists = branchList.trim().length > 0

      if (!exists && !createIfNotExists) {
        return JSON.stringify({
          status: "error",
          message: `Branch '\''${branch}'\'' does not exist. Set createIfNotExists to true to create it.`,
        })
      }
      if (!exists) {
        const { exitCode, stderr } = await exec(`git checkout -b ${shellEscape(branch)}`)
        if (exitCode !== 0) {
          return JSON.stringify({
            status: "error",
            message: `Failed to create branch '\''${branch}'\'': ${stderr}`,
          })
        }
        return JSON.stringify({
          status: "success",
          message: `Created and checked out branch '\''${branch}'\''`,
          created: true,
        })
      } else {
        const { exitCode, stderr } = await exec(`git checkout -q ${shellEscape(branch)}`)
        if (exitCode !== 0) {
          return JSON.stringify({
            status: "error",
            message: `Failed to checkout branch '\''${branch}'\'': ${stderr}`,
          })
        }
        return JSON.stringify({
          status: "success",
          message: `Checked out existing branch '\''${branch}'\''`,
          created: false,
        })
      }
    }
  } catch (error: unknown) {
    return JSON.stringify({
      status: "error",
      message: `Unexpected error managing branch: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}

// Overloaded function signatures for backwards compatibility
/**
 * @deprecated Use dockerized version with `env: RepoEnvironment` params instead
 */
export function createBranchTool(
  baseDir: string
): Tool<typeof branchParameters, string>
export function createBranchTool(
  env: RepoEnvironment
): Tool<typeof branchParameters, string>
export function createBranchTool(
  arg: string | RepoEnvironment
): Tool<typeof branchParameters, string> {
  const env = asRepoEnvironment(arg)
  return createTool({
    name: "manage_branch",
    description:
      "Manage the branch of the repository. This will create or checkout the branch. It is highly recommended to check out a new branch before committing.",
    schema: branchParameters,
    handler: (params: BranchParams) => fnHandler(env, params),
  })
}
