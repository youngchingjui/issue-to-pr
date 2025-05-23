import path from "path"
import { z } from "zod"

import { writeFile } from "@/lib/fs"
import { createTool } from "@/lib/tools/helper"

const writeFileContentParameters = z.object({
  relativePath: z
    .string()
    .describe("The relative path of the file to write to"),
  content: z.string().describe("The content to write to the file"),
})

type WriteFileContentParams = z.infer<typeof writeFileContentParameters>

async function fnHandler(
  baseDir: string,
  params: WriteFileContentParams
): Promise<string> {
  const { relativePath, content } = params
  const fullPath = path.join(baseDir, relativePath)
  await writeFile(fullPath, content)
  return `File written successfully to ${relativePath}`
}

export const createWriteFileContentTool = (baseDir: string) =>
  createTool({
    name: "write_file",
    description: "Writes content to a file in the repository",
    schema: writeFileContentParameters,
    handler: (params: WriteFileContentParams) => fnHandler(baseDir, params),
  })
