import { exec } from "child_process"
import { promisify } from "util"
import { z } from "zod"

import { createTool } from "@/lib/tools/helper"

const execPromise = promisify(exec)

const name = "ripgrep_search"
const description =
  "Searches for code in the local file system using ripgrep. Returns snippets of code containing the search term with 3 lines of context before and after each match. Note: These are just snippets - to fully understand the code's context, you should use a file reading tool to examine the complete file contents."

const searchParameters = z.object({
  query: z
    .string()
    .describe(
      "The search query to use for searching code. Example: 'functionName' to find all occurrences of 'functionName' in the codebase."
    ),
  ignoreCase: z
    .boolean()
    .nullable()
    .describe(
      "Ignore case sensitivity. Default is false, meaning the search is case-sensitive. Use true to find matches regardless of case, e.g., 'function' will match 'Function'."
    ),
  hidden: z
    .boolean()
    .nullable()
    .describe(
      "Include hidden files. Default is false, meaning hidden files are ignored. Use true to include files like '.env'."
    ),
  follow: z
    .boolean()
    .nullable()
    .describe(
      "Follow symbolic links. Default is false, meaning symlinks are not followed. Use true to include files linked by symlinks in the search."
    ),
})

type RipgrepSearchParameters = z.infer<typeof searchParameters>

async function fnHandler(
  baseDir: string,
  params: RipgrepSearchParameters
): Promise<string> {
  const { query, ignoreCase, hidden, follow } = params

  // Set default values if parameters are null
  const isIgnoreCase = ignoreCase ?? false
  const includeHidden = hidden ?? false
  const followSymlinks = follow ?? false

  // Construct the ripgrep command with mandatory options
  // Using baseDir instead of './' to search in the specified directory
  let command = `cd "${baseDir}" && rg --line-number --max-filesize 200K -C 3 --heading -n '${query}' ./`

  // Add optional parameters based on user input
  if (isIgnoreCase) command += " -i"
  if (includeHidden) command += " --hidden"
  if (followSymlinks) command += " -L"

  try {
    const { stdout } = await execPromise(command)
    return stdout
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code: number }).code
      if (code === 1) {
        return "No matching results found in the codebase."
      } else if (code === 2) {
        throw new Error(`Ripgrep search failed: ${error || "Unknown error"}`)
      } else {
        console.error("Unexpected ripgrep exit code:", error)
        throw new Error(`Unexpected ripgrep exit code: ${code}`)
      }
    }
    throw error
  }
}

export const createRipgrepSearchTool = (baseDir: string) =>
  createTool({
    name,
    description,
    schema: searchParameters,
    handler: (params: RipgrepSearchParameters) => fnHandler(baseDir, params),
  })
