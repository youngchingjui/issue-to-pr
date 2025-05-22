import path from "path"
import { z } from "zod"

import {
  createCommit,
  getCommitHash,
  getCurrentBranch,
  stageFile,
} from "@/lib/git"
import { createTool } from "@/lib/tools/helper"

const commitParameters = z.object({
  files: z
    .array(z.string())
    .describe("The relative paths of the files to commit"),
  commitMessage: z.string().describe("The commit message to use"),
})

type CommitParams = z.infer<typeof commitParameters>

async function fnHandler(
  baseDir: string,
  defaultBranch: string,
  params: CommitParams
): Promise<string> {
  const { files, commitMessage } = params
  const currentBranch = await getCurrentBranch(baseDir)
  if (currentBranch === defaultBranch) {
    return JSON.stringify({
      status: "error",
      message:
        "Cannot commit on the default branch. Please first checkout another branch.",
    })
  }
  try {
    // Stage the files
    for (const file of files) {
      const filePath = path.join(baseDir, file)
      try {
        await stageFile(filePath, baseDir)
      } catch (error: unknown) {
        return JSON.stringify({
          status: "error",
          message: `Failed to stage file ${file}: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    }
    // Create the commit
    try {
      await createCommit(commitMessage, baseDir)
    } catch (error: unknown) {
      return JSON.stringify({
        status: "error",
        message: `Failed to create commit: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
    // Get the commit hash
    try {
      const commitHash = await getCommitHash(baseDir)
      return JSON.stringify({
        status: "success",
        message: "Successfully committed changes",
        commitHash,
      })
    } catch (error: unknown) {
      return JSON.stringify({
        status: "error",
        message: `Commit succeeded but failed to get commit hash: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  } catch (error: unknown) {
    return JSON.stringify({
      status: "error",
      message: `Unexpected error during commit: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}

export const createCommitTool = (baseDir: string, defaultBranch: string) =>
  createTool({
    name: "commit_changes",
    description:
      "Commit the changes to the repository. This will stage the files and create a commit with the given message. Avoid committing on the default branch.",
    schema: commitParameters,
    handler: (params: CommitParams) =>
      fnHandler(baseDir, defaultBranch, params),
  })
