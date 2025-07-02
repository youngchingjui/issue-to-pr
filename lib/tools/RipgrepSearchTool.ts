import { exec } from "child_process"
import { promisify } from "util"
import { z } from "zod"

import { execInContainer } from "@/lib/docker"
import { createTool } from "@/lib/tools/helper"
import { asRepoEnvironment, RepoEnvironment, Tool } from "@/lib/types"
import { shellEscape } from "@/lib/utils/cli"

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

/**
 * Helper to construct the ripgrep command string based on the supplied flags.
 * This eliminates duplication between the host/container execution branches.
 */
function buildRipgrepCommand({
  query,
  searchPath,
  ignoreCase,
  hidden,
  follow,
  mode,
}: {
  query: string
  searchPath: string
  ignoreCase: boolean
  hidden: boolean
  follow: boolean
  mode: "literal" | "regex"
}): string {
  // Robustly escape the user's query and search path for the shell
  const quotedQuery = shellEscape(query)
  const quotedPath = shellEscape(searchPath)

  let command = `rg --line-number --max-filesize 200K -C 3 --heading -n `

  if (mode === "literal") {
    command += "-F " // use literal/fixed-string mode
  }

  command += `${quotedQuery} ${quotedPath}`

  if (ignoreCase) command += " -i"
  if (hidden) command += " --hidden"
  if (follow) command += " -L"

  return command
}

async function fnHandler(
  env: RepoEnvironment,
  params: RipgrepSearchParameters
): Promise<string> {
  const { query, ignoreCase, hidden, follow, mode } = params

  // Set default values if parameters are null
  const flags = {
    ignoreCase: ignoreCase ?? false,
    hidden: hidden ?? false,
    follow: follow ?? false,
    mode: mode ?? ("literal" as "literal" | "regex"),
  }

  if (!query || typeof query !== "string" || query.length === 0) {
    throw new Error("Query string cannot be empty.")
  }

  if (env.kind === "host") {
    // Build command targeting the repository root
    const ripgrepCmd = buildRipgrepCommand({
      query,
      searchPath: "./",
      ...flags,
    })

    const command = `cd "${env.root}" && ${ripgrepCmd}`

    try {
      const { stdout } = await execPromise(command)
      return stdout
    } catch (error) {
      // Ripgrep conventions: exit 1 = no matches, exit 2 = error
      const execError = error as { code?: number; stderr?: string }
      const code = execError.code
      const stderr = execError.stderr

      if (code === 1) {
        return "No matching results found."
      }

      if (code === 2) {
        if (
          typeof stderr === "string" &&
          stderr.includes("regex parse error")
        ) {
          return `Ripgrep regex error: ${stderr}`
        }
        throw new Error(`Ripgrep search failed: ${stderr ?? error}`)
      }

      throw new Error(`Unexpected ripgrep exit code: ${code}`)
    }
  } else {
    // Container environment
    const searchDir = env.mount ?? "/workspace"
    const command = buildRipgrepCommand({
      query,
      searchPath: searchDir,
      ...flags,
    })

    try {
      const { stdout, stderr, exitCode } = await execInContainer({
        name: env.name,
        command,
      })

      // Handle ripgrep exit codes
      if (exitCode === 1) {
        if (stderr.trim()) {
          // Docker exec failed (e.g., container not running) rather than no matches
          throw new Error(`Ripgrep search failed: ${stderr}`)
        }
        return "No matching results found."
      }
      if (exitCode === 2) {
        if (stderr.includes("regex parse error")) {
          return `Ripgrep regex error: ${stderr}`
        }
        throw new Error(`Ripgrep search failed: ${stderr}`)
      }
      if (exitCode === 127) {
        throw new Error(
          `Ripgrep not found in container. Make sure ripgrep is installed. stderr: ${stderr}`
        )
      }
      if (exitCode !== 0) {
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
  const env = asRepoEnvironment(arg)

  return createTool({
    name,
    description,
    schema: searchParameters,
    handler: (params: RipgrepSearchParameters) => fnHandler(env, params),
  })
}
