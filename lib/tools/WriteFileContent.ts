import path from "path"
import { z } from "zod"

import { execInContainer } from "@/lib/docker"
import { writeFile } from "@/lib/fs"
import { asEnv, RepoEnvironment } from "@/lib/tools/env"
import { createTool } from "@/lib/tools/helper"
import { Tool } from "@/lib/types"

const writeFileContentParameters = z.object({
  relativePath: z
    .string()
    .describe("The relative path of the file to write to"),
  content: z.string().describe("The content to write to the file"),
})

type WriteFileContentParams = z.infer<typeof writeFileContentParameters>

function shellEscape(str: string): string {
  return "'" + str.replace(/'/g, "'\\''") + "'"
}

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
    const fileInContainer = path.posix.join(
      env.mount ?? "/workspace",
      relativePath
    )

    // Use printf to write content, escaping single quotes and handling newlines
    const escapedContent = content.replace(/'/g, "'\\''")
    const { stdout, stderr, exitCode } = await execInContainer({
      name: env.name,
      command: `printf '%s' ${shellEscape(escapedContent)} > ${shellEscape(fileInContainer)}`,
    })

    if (exitCode !== 0) {
      throw new Error(`Failed to write file: ${stderr}`)
    }
    return `File written successfully to ${relativePath}`
  }
}

// Overloaded function signatures for backwards compatibility
export function createWriteFileContentTool(
  baseDir: string
): Tool<typeof writeFileContentParameters, string>
export function createWriteFileContentTool(
  env: RepoEnvironment
): Tool<typeof writeFileContentParameters, string>
export function createWriteFileContentTool(
  arg: string | RepoEnvironment
): Tool<typeof writeFileContentParameters, string> {
  const env = asEnv(arg)

  return createTool({
    name: "write_file",
    description: "Writes content to a file in the repository",
    schema: writeFileContentParameters,
    handler: (params: WriteFileContentParams) => fnHandler(env, params),
  })
}
