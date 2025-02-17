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
    description: "Retrieves the file contents from local repository",
  })

  baseDir: string

  constructor(baseDir: string) {
    this.baseDir = baseDir
  }

  async handler(
    params: z.infer<typeof getFileContentParameters>
  ): Promise<string> {
    const { relativePath } = params

    try {
      return getFileContent(path.join(this.baseDir, relativePath))
    } catch (error) {
      if (error.code === "ENOENT") {
        return "FileNotFound"
      }
      console.error("Error getting file content:", error)
      throw error
    }
  }
}

export default GetFileContentTool
