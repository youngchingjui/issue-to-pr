import path from "path"
import { z } from "zod"

import { execInContainer } from "@/lib/docker"
import { writeFile } from "@/lib/fs"
import { createTool } from "@/lib/tools/helper"
import { asRepoEnvironment, RepoEnvironment, Tool } from "@/lib/types"
import { shellEscape } from "@/lib/utils/cli"

const writeFileContentParameters = z.object({
  relativePath: z
    .string()
    .describe("The relative path of the file to write to"),
  content: z.string().describe("The content to write to the file"),
})

type WriteFileContentParams = z.infer<typeof writeFileContentParameters>

async function fnHandler(
  env: RepoEnvironment,
  params: WriteFileContentParams
): Promise<string> {
  const { relativePath, content } = params

  if (env.kind === "host") {
    const fullPath = path.join(env.root, relativePath)
    await writeFile(fullPath, content)
    return `File written successfully to ${relativePath}`
  } else {
    // Container environment

    // Ensure the target directory exists
    const dirPath = path.dirname(relativePath)
    const mkdirResult = await execInContainer({
      name: env.name,
      command: `mkdir -p ${shellEscape(dirPath)}`,
      cwd: env.mount,
    })

    if (mkdirResult.exitCode !== 0) {
      throw new Error(`Failed to create directory: ${mkdirResult.stderr}`)
    }

    // Use printf to write content, shell-escaping the content and path (no double escapes)
    const { stderr, exitCode } = await execInContainer({
      name: env.name,
      // printf needs the content and file path both shell-escaped, no manual escaping of content
      command: `printf %s ${shellEscape(content)} > ${shellEscape(relativePath)}`,
      cwd: env.mount,
    })

    if (exitCode !== 0) {
      throw new Error(`Failed to write file: ${stderr}`)
    }
    return `File written successfully to ${relativePath}`
  }
}

// Overloaded function signatures for backwards compatibility
/**
 * @deprecated Use dockerized version with `env: RepoEnvironment` params instead
 */
export function createWriteFileContentTool(
  baseDir: string
): Tool<typeof writeFileContentParameters, string>
export function createWriteFileContentTool(
  env: RepoEnvironment
): Tool<typeof writeFileContentParameters, string>
export function createWriteFileContentTool(
  arg: string | RepoEnvironment
): Tool<typeof writeFileContentParameters, string> {
  const env = asRepoEnvironment(arg)

  return createTool({
    name: "write_file",
    description: "Writes content to a file in the repository",
    schema: writeFileContentParameters,
    handler: (params: WriteFileContentParams) => fnHandler(env, params),
  })
}
