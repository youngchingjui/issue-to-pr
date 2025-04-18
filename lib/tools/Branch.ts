import { zodFunction } from "openai/helpers/zod"
import { z } from "zod"

import {
  checkIfLocalBranchExists,
  checkoutBranchQuietly,
  createBranch,
} from "@/lib/git"
import { Tool } from "@/lib/types"

const branchParameters = z.object({
  branch: z.string().describe("The name of the branch to create or checkout"),
  createIfNotExists: z
    .boolean()
    .nullable()
    .describe(
      "Whether to create the branch if it doesn't exist. Defaults to false."
    ),
})

class BranchTool implements Tool<typeof branchParameters> {
  baseDir: string

  constructor(baseDir: string) {
    this.baseDir = baseDir
  }

  parameters = branchParameters
  tool = zodFunction({
    name: "manage_branch",
    parameters: branchParameters,
    description:
      "Manage the branch of the repository. This will create or checkout the branch. It is highly recommended to check out a new branch before committing.",
  })

  async handler(
    params: z.infer<typeof branchParameters>,
    ...args: unknown[]
  ): Promise<string> {
    const { branch, createIfNotExists = false } = params

    try {
      // Check if branch exists
      const exists = await checkIfLocalBranchExists(branch, this.baseDir)

      if (!exists && !createIfNotExists) {
        return JSON.stringify({
          status: "error",
          message: `Branch '${branch}' does not exist. Set createIfNotExists to true to create it.`,
        })
      }

      if (!exists) {
        // Create and checkout the branch
        try {
          await createBranch(branch, this.baseDir)
          return JSON.stringify({
            status: "success",
            message: `Created and checked out branch '${branch}'`,
            created: true,
          })
        } catch (error) {
          return JSON.stringify({
            status: "error",
            message: `Failed to create branch '${branch}': ${error.message}`,
          })
        }
      } else {
        // Branch exists, just checkout
        try {
          await checkoutBranchQuietly(branch, this.baseDir)
          return JSON.stringify({
            status: "success",
            message: `Checked out existing branch '${branch}'`,
            created: false,
          })
        } catch (error) {
          return JSON.stringify({
            status: "error",
            message: `Failed to checkout branch '${branch}': ${error.message}`,
          })
        }
      }
    } catch (error) {
      return JSON.stringify({
        status: "error",
        message: `Unexpected error managing branch: ${error.message}`,
      })
    }
  }
}

export default BranchTool
