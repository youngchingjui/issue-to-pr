import { exec } from "child_process"
import { zodFunction } from "openai/helpers/zod"
import { promisify } from "util"
import { z } from "zod"

import { Tool } from "@/lib/types"

const execPromise = promisify(exec)

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

class RipgrepSearchTool implements Tool<typeof searchParameters> {
  private baseDir: string

  constructor(baseDir: string) {
    this.baseDir = baseDir
  }

  parameters = searchParameters

  async handler(params: z.infer<typeof searchParameters>): Promise<string> {
    const { query, ignoreCase, hidden, follow } = params

    // Set default values if parameters are null
    const isIgnoreCase = ignoreCase ?? false
    const includeHidden = hidden ?? false
    const followSymlinks = follow ?? false

    // Construct the ripgrep command with mandatory options
    // Using baseDir instead of './' to search in the specified directory
    let command = `cd "${this.baseDir}" && rg --line-number --max-filesize 200K -C 3 --heading -n '${query}' ./`

    // Add optional parameters based on user input
    if (isIgnoreCase) command += " -i"
    if (includeHidden) command += " --hidden"
    if (followSymlinks) command += " -L"

    try {
      const { stdout } = await execPromise(command)
      return stdout
    } catch (error) {
      // Check exit code to determine the appropriate response
      if (error.code === 1) {
        // Exit code 1 means no matches were found (not an error)
        return "No matching results found in the codebase."
      } else if (error.code === 2) {
        // Exit code 2 indicates a real error occurred
        console.error("Error executing ripgrep search:", error)
        throw new Error(
          `Ripgrep search failed: ${error.message || "Unknown error"}`
        )
      } else {
        // Handle any other unexpected errors
        console.error("Unexpected error during ripgrep search:", error)
        throw error
      }
    }
  }

  tool = zodFunction({
    name: "ripgrep_search",
    parameters: searchParameters,
    description:
      "Searches for code in the local file system using ripgrep. Returns snippets of code containing the search term with 3 lines of context before and after each match. Note: These are just snippets - to fully understand the code's context, you should use a file reading tool to examine the complete file contents.",
  })
}

export default RipgrepSearchTool
