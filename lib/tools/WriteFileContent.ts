import path from "path"
import { z } from "zod"

import { writeFileInContainer } from "@/lib/docker"
import { writeFile } from "@/lib/fs"
import { createTool } from "@/lib/tools/helper"
import { asRepoEnvironment, RepoEnvironment, Tool } from "@/lib/types"

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
    // Container environment using Docker helper
    const { exitCode, stderr } = await writeFileInContainer({
      name: env.name,
      workdir: env.mount ?? "/workspace",
      relPath: relativePath,
      contents: content,
      makeDirs: true,
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
