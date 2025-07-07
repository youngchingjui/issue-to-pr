import path from "path"
import { z } from "zod"

import { execInContainer } from "@/lib/docker"
import {
  createCommit,
  getCommitHash,
  getCurrentBranch,
  stageFile,
} from "@/lib/git"
import { createTool } from "@/lib/tools/helper"
import { asRepoEnvironment, RepoEnvironment, Tool } from "@/lib/types"
import { shellEscape } from "@/lib/utils/cli"

const commitParameters = z.object({
  files: z
    .array(z.string())
    .describe("The relative paths of the files to commit"),
  commitMessage: z.string().describe("The commit message to use"),
})

type CommitParams = z.infer<typeof commitParameters>

async function fnHandler(
  env: RepoEnvironment,
  defaultBranch: string,
  params: CommitParams
): Promise<string> {
  const { files, commitMessage } = params
  const currentBranch =
    env.kind === "host"
      ? await getCurrentBranch(env.root)
      : (
          await execInContainer({
            name: env.name,
            command: "git rev-parse --abbrev-ref HEAD",
          })
        ).stdout.trim()
  if (currentBranch === defaultBranch) {
    return JSON.stringify({
      status: "error",
      message:
        "Cannot commit on the default branch. Please first checkout another branch.",
    })
  }
  try {
    for (const file of files) {
      const filePath =
        env.kind === "host"
          ? path.join(env.root, file)
          : path.posix.join(env.mount ?? "/workspace", file)
      if (env.kind === "host") {
        try {
          await stageFile(filePath, env.root)
        } catch (error: unknown) {
          return JSON.stringify({
            status: "error",
            message: `Failed to stage file ${file}: ${error instanceof Error ? error.message : String(error)}`,
          })
        }
      } else {
        const { exitCode, stderr } = await execInContainer({
          name: env.name,
          command: `git add ${shellEscape(filePath)}`,
        })
        if (exitCode !== 0) {
          return JSON.stringify({
            status: "error",
            message: `Failed to stage file ${file}: ${stderr}`,
          })
        }
      }
    }

    if (env.kind === "host") {
      await createCommit(commitMessage, env.root)
    } else {
      const { exitCode, stderr } = await execInContainer({
        name: env.name,
        command: `git commit -m ${shellEscape(commitMessage)}`,
      })
      if (exitCode !== 0) {
        return JSON.stringify({
          status: "error",
          message: `Failed to create commit: ${stderr}`,
        })
      }
    }

    const commitHash =
      env.kind === "host"
        ? await getCommitHash(env.root)
        : (
            await execInContainer({
              name: env.name,
              command: "git rev-parse HEAD",
            })
          ).stdout.trim()

    return JSON.stringify({
      status: "success",
      message: "Successfully committed changes",
      commitHash,
    })
  } catch (error: unknown) {
    return JSON.stringify({
      status: "error",
      message: `Unexpected error during commit: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}

// Overloaded function signatures for backwards compatibility
/**
 * @deprecated Use dockerized version with `env: RepoEnvironment` params instead
 */
export function createCommitTool(
  baseDir: string,
  defaultBranch: string
): Tool<typeof commitParameters, string>
export function createCommitTool(
  env: RepoEnvironment,
  defaultBranch: string
): Tool<typeof commitParameters, string>
export function createCommitTool(
  arg: string | RepoEnvironment,
  defaultBranch: string
): Tool<typeof commitParameters, string> {
  const env = asRepoEnvironment(arg)
  return createTool({
    name: "commit_changes",
    description:
      "Commit the changes to the repository. This will stage the files and create a commit with the given message. Avoid committing on the default branch.",
    schema: commitParameters,
    handler: (params: CommitParams) => fnHandler(env, defaultBranch, params),
  })
}
