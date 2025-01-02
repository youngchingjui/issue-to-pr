import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"

import { createDirectoryTree } from "@/lib/fs"
import { Issue } from "@/lib/github"
import { openai } from "@/lib/openai"

interface FileListResponse {
  files?: string[]
}

const FileListResponseSchema: z.ZodType<FileListResponse> = z
  .object({
    files: z.array(z.string()),
  })
  .strict()

export const identifyRelevantFiles = async (
  issue: Issue,
  cwd: string = null
): Promise<FileListResponse> => {
  // Given the issue and a tree of files, identify the files that are relevant to the issue
  // We can use the issue title and description to identify the files

  const tree = createDirectoryTree(cwd || process.cwd())

  const userInstructions = `
    Given the issue and a tree of files, identify which files are relevant to the issue
    The issue is: ${issue.title}
    The issue description is: ${issue.body}
    Repository tree: ${tree}
    Provide the full relative path to the file(s) that are relevant to the issue
    Output in JSON format
  `

  // TODO: Ensure that the files are relative to the cwd

  const response = await openai.beta.chat.completions.parse({
    model: "gpt-4o",
    messages: [{ role: "user", content: userInstructions }],
    response_format: zodResponseFormat(FileListResponseSchema, "file_list"),
  })

  console.debug(
    "[DEBUG] File list response:",
    response.choices[0].message.parsed
  )
  return response.choices[0].message.parsed
}
