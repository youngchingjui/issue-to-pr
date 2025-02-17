import { zodFunction } from "openai/helpers/zod"
import path from "path"
import { z } from "zod"

import { writeFile } from "@/lib/fs"
import { Tool } from "@/lib/types"

const writeFileContentParameters = z.object({
  relativePath: z
    .string()
    .describe("The relative path of the file to write to"),
  content: z.string().describe("The content to write to the file"),
})

export default class WriteFileContentTool
  implements Tool<typeof writeFileContentParameters>
{
  baseDir: string

  constructor(baseDir: string) {
    this.baseDir = baseDir
  }

  parameters = writeFileContentParameters
  tool = zodFunction({
    name: "write_file",
    parameters: writeFileContentParameters,
    description: "Writes content to a file in the repository",
  })

  async handler(
    params: z.infer<typeof writeFileContentParameters>
  ): Promise<string> {
    const { relativePath, content } = params
    const fullPath = path.join(this.baseDir, relativePath)
    await writeFile(fullPath, content)
    return `File written successfully to ${relativePath}`
  }
}
