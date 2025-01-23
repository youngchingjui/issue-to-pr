import { zodFunction } from "openai/helpers/zod"
import path from "path"
import { z } from "zod"

import { getFileContent } from "@/lib/fs"
import { Tool } from "@/lib/types"

const getFileContentParameters = z.object({
  relativePath: z
    .string()
    .describe("The relative path of the file to retrieve"),
})

class GetFileContentTool implements Tool<typeof getFileContentParameters> {
  parameters = getFileContentParameters
  tool = zodFunction({
    name: "get_file_content",
    parameters: getFileContentParameters,
  })
  baseDir: string | null

  constructor(baseDir: string | null = null) {
    this.baseDir = baseDir
  }

  async handler(params: z.infer<typeof getFileContentParameters>) {
    const { relativePath } = params

    if (!this.baseDir) {
      throw new Error("Base directory not set")
    }

    try {
      return await getFileContent(path.join(this.baseDir, relativePath))
    } catch (error) {
      console.error("Error getting file content:", error)
      throw error
    }
  }
}

export default GetFileContentTool
