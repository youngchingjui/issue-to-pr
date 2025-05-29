import path from "path"
import { z } from "zod"

import { getFileContent } from "@/lib/fs"
import { createTool } from "@/lib/tools/helper"

const name = "get_file_content"
const description = "Retrieves the file contents from local repository"

const getFileContentschema = z.object({
  relativePath: z
    .string()
    .describe("The relative path of the file to retrieve"),
})

type getFileContentParameters = z.infer<typeof getFileContentschema>

async function fnHandler(
  baseDir: string,
  params: getFileContentParameters
): Promise<string> {
  const { relativePath } = params

  try {
    return await getFileContent(path.join(baseDir, relativePath))
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return String(error)
    }
    throw error
  }
}

export const createGetFileContentTool = (baseDir: string) =>
  createTool({
    name,
    description,
    schema: getFileContentschema,
    handler: (params: getFileContentParameters) => fnHandler(baseDir, params),
  })
