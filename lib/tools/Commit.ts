import { zodFunction } from "openai/helpers/zod"
import path from "path"
import { z } from "zod"

import { createCommit, getCommitHash, stageFile } from "@/lib/git"
import { getCurrentBranch } from "@/lib/git"
import { Tool } from "@/lib/types"

const commitParameters = z.object({
  files: z
    .array(z.string())
    .describe("The relative paths of the files to commit"),
  commitMessage: z.string().describe("The commit message to use"),
})

class CommitTool implements Tool<typeof commitParameters> {
  baseDir: string
  defaultBranch: string

  constructor(baseDir: string, defaultBranch: string) {
    this.baseDir = baseDir
    this.defaultBranch = defaultBranch
  }

  parameters = commitParameters
  tool = zodFunction({
    name: "commit_changes",
    parameters: commitParameters,
    description:
      "Commit the changes to the repository. This will stage the files and create a commit with the given message. Avoid committing on the default branch.",
  })

  async handler(params: z.infer<typeof commitParameters>): Promise<string> {
    const { files, commitMessage } = params

    // Check if current branch is the default branch before committing
    const currentBranch = await getCurrentBranch(this.baseDir)
    if (currentBranch === this.defaultBranch) {
      return JSON.stringify({
        status: "error",
        message:
          "Cannot commit on the default branch. Please first checkout another branch.",
      })
    }

    try {
      // Stage the files
      for (const file of files) {
        const filePath = path.join(this.baseDir, file)
        try {
          await stageFile(filePath, this.baseDir)
        } catch (error) {
          return JSON.stringify({
            status: "error",
            message: `Failed to stage file ${file}: ${error.message}`,
          })
        }
      }

      // Create the commit
      try {
        await createCommit(commitMessage, this.baseDir)
      } catch (error) {
        return JSON.stringify({
          status: "error",
          message: `Failed to create commit: ${error.message}`,
        })
      }

      // Get the commit hash
      try {
        const commitHash = await getCommitHash(this.baseDir)
        return JSON.stringify({
          status: "success",
          message: "Successfully committed changes",
          commitHash,
        })
      } catch (error) {
        return JSON.stringify({
          status: "error",
          message: `Commit succeeded but failed to get commit hash: ${error.message}`,
        })
      }
    } catch (error) {
      return JSON.stringify({
        status: "error",
        message: `Unexpected error during commit: ${error.message}`,
      })
    }
  }
}

export default CommitTool
