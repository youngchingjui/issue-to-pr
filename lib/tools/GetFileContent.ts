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

// Validation rules for relative paths (Linux-only runtime):
// 1. Must be a non-empty UTF-8 string.
// 2. Must be relative (no leading '/').
// 3. Must not contain ".." segments (directory traversal).
// 4. Must not contain NUL bytes or control characters.
// 5. Must not contain empty ("//") or single-dot ("./") segments.
//
// All other Unicode codepoints — including spaces, emojis, and non-Latin scripts — are allowed so that
// real-world filenames like "コンポーネント/🚀 launch plan.md" pass validation.
const relativePathSchema = z
  .string()
  .min(1, { message: "Path cannot be empty" })
  // Disallow NUL byte and other ASCII control chars (0x00-0x1F, 0x7F)
  .refine((p) => !/[\0-\x1F\x7F]/.test(p), {
    message: "Path contains control characters or null bytes",
  })
  .refine((p) => !path.isAbsolute(p), {
    message: "Path must be relative (no leading '/')",
  })
  // Prevent directory traversal
  .refine((p) => !p.split("/").includes(".."), {
    message: "Path may not contain '..' segments",
  })
  // Reject empty ("//") or single-dot ("./") segments while allowing dotfiles like ".env"
  .refine(
    (p) => p.split("/").every((segment) => segment !== "" && segment !== "."),
    {
      message: "Path contains empty or '.' segments",
    }
  )
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
