import { zodFunction } from "openai/helpers/zod"
import { z } from "zod/lib"

import { writeFile } from "../fs"
import { Tool } from "../types"

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
  })

  async handler(
    params: z.infer<typeof writeFileContentParameters>
  ): Promise<string> {
    const { relativePath, content } = params
    await writeFile(this.baseDir, relativePath, content)
    return `File written successfully to ${relativePath}`
  }
}
