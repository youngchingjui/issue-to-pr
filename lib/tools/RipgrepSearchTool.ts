import { exec } from "child_process"
import { promisify } from "util"
import { z } from "zod"

import { execInContainer } from "@/lib/docker"
import { asEnv, RepoEnvironment } from "@/lib/tools/env"
import { createTool } from "@/lib/tools/helper"
import { Tool } from "@/lib/types"

const execPromise = promisify(exec)

const name = "ripgrep_search"
const description = `Searches for code in the local file system using ripgrep. Returns snippets of code containing the search term with 3 lines of context before and after each match. Note: These are just snippets - to fully understand the code's context, you should use a file reading tool to examine the complete file contents.

The tool supports both literal (fixed-string) and regex search modes. By default, search queries are treated as literal strings (no regex interpretation, safer). To enable regex matching, specify mode: "regex" in the parameters.
- mode: "literal" (default, safer) — uses ripgrep's -F flag, interprets search as a fixed string, safe for special characters like ?, *, [, ]
- mode: "regex" — disables -F, allows regex pattern searches, may return ripgrep errors if regex is malformed.`

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
  mode: z
    .enum(["literal", "regex"])
    .optional()
    .describe('Search mode: "literal" (default, safer) or "regex"'),
})

type RipgrepSearchParameters = z.infer<typeof searchParameters>

function shellEscapeSingleQuotes(str: string): string {
  // Replace every ' with '\'' and wrap the string in single quotes
  // This safely escapes single quotes for POSIX shells
  return "'" + str.replace(/'/g, "'\\''") + "'"
}

async function fnHandler(
  env: RepoEnvironment,
  params: RipgrepSearchParameters
): Promise<string> {
  const { query, ignoreCase, hidden, follow, mode } = params

  // Set default values if parameters are null
  const isIgnoreCase = ignoreCase ?? false
  const includeHidden = hidden ?? false
  const followSymlinks = follow ?? false
  const searchMode = mode ?? "literal" // backward compatibility to old calls

  if (!query || typeof query !== "string" || query.length === 0) {
    throw new Error("Query string cannot be empty.")
  }

  // Robustly escape the user's query for the shell
  const quotedQuery = shellEscapeSingleQuotes(query)

  if (env.kind === "host") {
    // Host environment - use existing logic
    let command = `cd "${env.root}" && rg --line-number --max-filesize 200K -C 3 --heading -n `

    if (searchMode === "literal") {
      command += "-F " // use literal/fixed-string mode
    }

    command += `${quotedQuery} ./`

    if (isIgnoreCase) command += " -i"
    if (includeHidden) command += " --hidden"
    if (followSymlinks) command += " -L"

    try {
      const { stdout } = await execPromise(command)
      return stdout
    } catch (error) {
      // Ripgrep conventions: exit 1 = no matches, exit 2 = error
      if (error && typeof error === "object" && "code" in error) {
        const code = error.code
        if (code === 1) {
          return "No matching results found."
        } else if (
          code === 2 &&
          "stderr" in error &&
          typeof error.stderr === "string" &&
          error.stderr.includes("regex parse error")
        ) {
          return `Ripgrep regex error: ${error.stderr}`
        } else if (code === 2) {
          throw new Error(`Ripgrep search failed: ${error}`)
        } else {
          console.error("Unexpected ripgrep exit code:", error)
          throw new Error(`Unexpected ripgrep exit code: ${code}`)
        }
      }
      throw error
    }
  } else {
    // Container environment
    const searchDir = env.mount ?? "/workspace"
    let command = `rg --line-number --max-filesize 200K -C 3 --heading -n `

    if (searchMode === "literal") {
      command += "-F " // use literal/fixed-string mode
    }

    command += `${quotedQuery} ${searchDir}`

    if (isIgnoreCase) command += " -i"
    if (includeHidden) command += " --hidden"
    if (followSymlinks) command += " -L"

    try {
      const { stdout, stderr, exitCode } = await execInContainer({
        name: env.name,
        command,
      })

      // Handle ripgrep exit codes
      if (exitCode === 1) {
        return "No matching results found."
      } else if (exitCode === 2) {
        if (stderr.includes("regex parse error")) {
          return `Ripgrep regex error: ${stderr}`
        } else {
          throw new Error(`Ripgrep search failed: ${stderr}`)
        }
      } else if (exitCode === 127) {
        throw new Error(
          `Ripgrep not found in container. Make sure ripgrep is installed. stderr: ${stderr}`
        )
      } else if (exitCode !== 0) {
        throw new Error(
          `Unexpected ripgrep exit code: ${exitCode}. stderr: ${stderr}`
        )
      }

      return stdout
    } catch (error) {
      throw error
    }
  }
}

// Overloaded function signatures for backwards compatibility
/**
 *
 * @deprecated Use dockerized version with `env: RepoEnvironment` params instead
 */
export function createRipgrepSearchTool(
  baseDir: string
): Tool<typeof searchParameters, string>
export function createRipgrepSearchTool(
  env: RepoEnvironment
): Tool<typeof searchParameters, string>
export function createRipgrepSearchTool(
  arg: string | RepoEnvironment
): Tool<typeof searchParameters, string> {
  const env = asEnv(arg)

  return createTool({
    name,
    description,
    schema: searchParameters,
    handler: (params: RipgrepSearchParameters) => fnHandler(env, params),
  })
}
