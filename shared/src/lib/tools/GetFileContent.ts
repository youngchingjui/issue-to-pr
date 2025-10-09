import path from "path"
import { z } from "zod"

import { execInContainerWithDockerode } from "@/lib/docker"
import { getFileContent } from "@/lib/fs"
import { createTool } from "@/lib/tools/helper"
import { asRepoEnvironment, RepoEnvironment, Tool } from "@/lib/types"
import { relativePathSchema } from "@/lib/types/utils/path"

const name = "get_file_content"
const description =
  "Retrieves the file contents from local repository. Only provide file paths, not directories. Attempting to read a directory will return an error."

const getFileContentschema = z.object({
  relativePath: relativePathSchema,
})

type getFileContentParameters = z.infer<typeof getFileContentschema>

async function fnHandler(
  env: RepoEnvironment,
  params: getFileContentParameters
): Promise<string> {
  const { relativePath } = params

  try {
    if (env.kind === "host") {
      return await getFileContent(path.join(env.root, relativePath))
    } else {
      // Container environment
      const fileInContainer = path.posix.join(
        env.mount ?? "/workspace",
        relativePath
      )
      const { stdout, stderr, exitCode } = await execInContainerWithDockerode({
        name: env.name,
        command: `cat '${fileInContainer}'`,
      })

      if (exitCode !== 0) {
        return `Error reading file: ${stderr || `File not found: ${relativePath}`}`
      }
      return stdout
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error.code === "ENOENT" || error.code === "EISDIR")
    ) {
      return String(error)
    }
    throw error
  }
}

// Overloaded function signatures for backwards compatibility
/**
 * @deprecated Use Dockerized RepoEnvironment directly instead
 */
export function createGetFileContentTool(
  baseDir: string
): Tool<typeof getFileContentschema, string>
export function createGetFileContentTool(
  env: RepoEnvironment
): Tool<typeof getFileContentschema, string>
export function createGetFileContentTool(
  arg: string | RepoEnvironment
): Tool<typeof getFileContentschema, string> {
  const env = asRepoEnvironment(arg)

  return createTool({
    name,
    description,
    schema: getFileContentschema,
    handler: (params: getFileContentParameters) => fnHandler(env, params),
  })
}
