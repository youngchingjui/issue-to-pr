import path from "path"
import { z } from "zod"

import { execInContainer } from "@/lib/docker"
import { getFileContent } from "@/lib/fs"
import { asEnv, RepoEnvironment } from "@/lib/tools/env"
import { createTool } from "@/lib/tools/helper"
import { Tool } from "@/lib/types"

const name = "get_file_content"
const description =
  "Retrieves the file contents from local repository. Only provide file paths, not directories. Attempting to read a directory will return an error."

// Restrict relativePath so we can safely interpolate it into a shell command.
// 1. Only allow alphanumerics, '_', '-', '.', and '/'
// 2. Must be relative (no leading '/')
// 3. Must not contain ".." segments (directory traversal)
const relativePathSchema = z
  .string()
  .regex(/^[A-Za-z0-9_.\-\/]+$/, {
    message: "Path contains forbidden characters. Allowed: A-Z a-z 0-9 _ . - /",
  })
  .refine((p) => !path.isAbsolute(p), {
    message: "Path must be relative (no leading '/')",
  })
  .refine((p) => !p.split("/").includes(".."), {
    message: "Path may not contain '..' segments",
  })
  .describe("The relative path of the file to retrieve")

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
      const { stdout, stderr, exitCode } = await execInContainer({
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
export function createGetFileContentTool(
  baseDir: string
): Tool<typeof getFileContentschema, string>
export function createGetFileContentTool(
  env: RepoEnvironment
): Tool<typeof getFileContentschema, string>
export function createGetFileContentTool(
  arg: string | RepoEnvironment
): Tool<typeof getFileContentschema, string> {
  const env = asEnv(arg)

  return createTool({
    name,
    description,
    schema: getFileContentschema,
    handler: (params: getFileContentParameters) => fnHandler(env, params),
  })
}
