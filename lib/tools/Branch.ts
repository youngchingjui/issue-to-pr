import { z } from "zod"

import {
  checkIfLocalBranchExists,
  checkoutBranchQuietly,
  createBranch,
} from "@/lib/git"
import { createTool } from "@/lib/tools/helper"

const branchParameters = z.object({
  branch: z.string().describe("The name of the branch to create or checkout"),
  createIfNotExists: z
    .boolean()
    .nullable()
    .describe(
      "Whether to create the branch if it doesn't exist. Defaults to false."
    ),
})

type BranchParams = z.infer<typeof branchParameters>

async function fnHandler(
  baseDir: string,
  params: BranchParams
): Promise<string> {
  const { branch, createIfNotExists = false } = params
  try {
    // Check if branch exists
    const exists = await checkIfLocalBranchExists(branch, baseDir)
    if (!exists && !createIfNotExists) {
      return JSON.stringify({
        status: "error",
        message: `Branch '${branch}' does not exist. Set createIfNotExists to true to create it.`,
      })
    }
    if (!exists) {
      // Create and checkout the branch
      try {
        await createBranch(branch, baseDir)
        return JSON.stringify({
          status: "success",
          message: `Created and checked out branch '${branch}'`,
          created: true,
        })
      } catch (error: unknown) {
        return JSON.stringify({
          status: "error",
          message: `Failed to create branch '${branch}': ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    } else {
      // Branch exists, just checkout
      try {
        await checkoutBranchQuietly(branch, baseDir)
        return JSON.stringify({
          status: "success",
          message: `Checked out existing branch '${branch}'`,
          created: false,
        })
      } catch (error: unknown) {
        return JSON.stringify({
          status: "error",
          message: `Failed to checkout branch '${branch}': ${error instanceof Error ? error.message : String(error)}`,
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

export const createBranchTool = (baseDir: string) =>
  createTool({
    name: "manage_branch",
    description:
      "Manage the branch of the repository. This will create or checkout the branch. It is highly recommended to check out a new branch before committing.",
    schema: branchParameters,
    handler: (params: BranchParams) => fnHandler(baseDir, params),
  })
