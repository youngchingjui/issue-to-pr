import { spawn } from "child_process"
import { z } from "zod"

import { execInContainerWithDockerode } from "@/lib/docker"
import { createTool } from "@/lib/tools/helper"
import { asRepoEnvironment, RepoEnvironment, Tool } from "@/lib/types"
import { shellEscape } from "@/lib/utils/cli"

/**
 * Execute ripgrep using spawn to avoid shell escaping issues
 */
function executeRipgrep({
  query,
  ignoreCase,
  hidden,
  follow,
  mode,
  cwd,
  timeout = 5000,
}: {
  query: string
  ignoreCase: boolean
  hidden: boolean
  follow: boolean
  mode: "literal" | "regex"
  cwd: string
  timeout?: number
}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const args = [
      "--line-number",
      "--max-filesize",
      "200K",
      "-C",
      "1",
      "--heading",
      "-n",
    ]

    if (mode === "literal") {
      args.push("-F") // use literal/fixed-string mode
    }

    if (ignoreCase) args.push("-i")
    if (hidden) args.push("--hidden")
    if (follow) args.push("-L")

    args.push(query)

    const child = spawn("rg", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"], // explicitly ignore stdin, pipe stdout/stderr
    })

    let stdout = ""
    let stderr = ""
    let resolved = false

    child.stdout?.on("data", (data) => {
      stdout += data.toString()
    })

    child.stderr?.on("data", (data) => {
      stderr += data.toString()
    })

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        child.kill("SIGTERM")
        resolved = true
        reject(new Error("Command timed out"))
      }
    }, timeout)

    child.on("close", (code, signal) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeoutId)
        resolve({ stdout, stderr, exitCode: code || 0 })
      }
    })

    child.on("error", (error) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeoutId)
        reject(error)
      }
    })
  })
}

const name = "ripgrep_search"
const description = `Searches for code in the local file system using ripgrep. Returns snippets of code containing the search term with 1 line of context before and after each match. Results are paginated by character count to avoid excessively long responses. Note: These are just snippets - to fully understand the code's context, you should use a file reading tool to examine the complete file contents.

The tool supports both literal (fixed-string) and regex search modes. By default, search queries are treated as literal strings (no regex interpretation, safer). To enable regex matching, specify mode: "regex" in the parameters.
- mode: "literal" (default, safer) — uses ripgrep's -F flag, interprets search as a fixed string, safe for special characters like ?, *, [, ]
- mode: "regex" — disables -F, allows regex pattern searches, may return ripgrep errors if regex is malformed.`

export const searchParameters = z.object({
  query: z
    .string()
    .describe(
      "The search query to use for searching code. Example: 'functionName' to find all occurrences of 'functionName' in the codebase."
    ),
  ignoreCase: z
    .boolean()
    .optional()
    .describe(
      "Ignore case sensitivity. Default is false, meaning the search is case-sensitive. Use true to find matches regardless of case, e.g., 'function' will match 'Function'."
    ),
  hidden: z
    .boolean()
    .optional()
    .describe(
      "Include hidden files. Default is false, meaning hidden files are ignored. Use true to include files like '.env'."
    ),
  follow: z
    .boolean()
    .optional()
    .describe(
      "Follow symbolic links. Default is false, meaning symlinks are not followed. Use true to include files linked by symlinks in the search."
    ),
  mode: z
    .enum(["literal", "regex"])
    .optional()
    .describe("Search mode: 'literal' (default, safer) or 'regex'"),
  maxChars: z
    .number()
    .int()
    .positive()
    .describe(
      "Maximum number of characters to return per page. Defaults to 10000."
    )
    .default(10000),
  page: z
    .number()
    .int()
    .min(1)
    .describe("Page number of results to return, starting at 1.")
    .default(1),
})

export type RipgrepSearchParameters = z.infer<typeof searchParameters>

/**
 * Helper to construct the ripgrep command string based on the supplied flags.
 * This eliminates duplication between the host/container execution branches.
 */
function buildRipgrepCommand({
  query,
  ignoreCase,
  hidden,
  follow,
  mode,
}: {
  query: string
  ignoreCase: boolean
  hidden: boolean
  follow: boolean
  mode: "literal" | "regex"
}): string {
  // Assemble the base ripgrep command. All option flags MUST appear before the
  // search pattern; otherwise, ripgrep will treat them as PATH arguments and
  // the command can hang or yield unexpected results.
  let command = `rg --line-number --max-filesize 200K -C 1 --heading -n`

  if (mode === "literal") {
    command += " -F" // use literal/fixed-string mode
  }

  if (ignoreCase) command += " -i"
  if (hidden) command += " --hidden"
  if (follow) command += " -L"

  // Finally append the (safely escaped) search pattern. `shellEscape` wraps the
  // pattern in single-quotes and handles any embedded quotes so the resulting
  // string is safe to pass through `sh -c`.
  command += ` ${shellEscape(query)}`

  return command
}

async function fnHandler(
  env: RepoEnvironment,
  params: RipgrepSearchParameters
): Promise<string> {
  const { query, ignoreCase, hidden, follow, mode, maxChars, page } = params

  // Set default values if parameters are null
  const flags = {
    ignoreCase: ignoreCase ?? false,
    hidden: hidden ?? false,
    follow: follow ?? false,
    mode: mode ?? ("literal" as "literal" | "regex"),
  }

  if (!query || typeof query !== "string" || query.length === 0) {
    return "Ripgrep search failed: Query string cannot be empty."
  }

  if (env.kind === "host") {
    try {
      const { stdout, stderr, exitCode } = await executeRipgrep({
        query,
        ...flags,
        cwd: env.root,
      })

      // Handle ripgrep exit codes
      if (exitCode === 1) {
        return "No matching results found."
      }

      if (exitCode === 2) {
        if (stderr.includes("regex parse error")) {
          return `Ripgrep regex error: ${stderr}`
        }
        return `Ripgrep search failed: ${stderr}`
      }

      if (exitCode !== 0) {
        return `Ripgrep search failed: Unexpected ripgrep exit code: ${exitCode}. stderr: ${stderr}`
      }

      const perPage = maxChars
      const currentPage = page
      const start = (currentPage - 1) * perPage
      const end = start + perPage
      const output = stdout || ""
      if (start >= output.length) {
        return ""
      }
      let slice = output.slice(start, end)
      if (end < output.length) {
        slice += `\n[...truncated. Use page ${currentPage + 1} to continue.]`
      }
      return slice || "No matching results found."
    } catch (error) {
      if (String(error).includes("Command timed out")) {
        return "Ripgrep search failed: Command timed out"
      }

      if (String(error).includes("ENOENT")) {
        return "Ripgrep search failed: Ripgrep not found. Make sure ripgrep is installed."
      }

      return `Ripgrep search failed: ${String(error)}`
    }
  } else {
    // Container environment
    const command = buildRipgrepCommand({
      query,
      ...flags,
    })

    try {
      const { stdout, stderr, exitCode } = await execInContainerWithDockerode({
        name: env.name,
        command,
        cwd: env.mount || undefined,
      })

      // Handle ripgrep exit codes
      if (exitCode === 1) {
        if (stderr.trim()) {
          // Docker exec failed (e.g., container not running) rather than no matches
          return `Ripgrep search failed: ${stderr}`
        }
        return "No matching results found."
      }
      if (exitCode === 2) {
        if (stderr.includes("regex parse error")) {
          return `Ripgrep regex error: ${stderr}`
        }
        return `Ripgrep search failed: ${stderr}`
      }
      if (exitCode === 127) {
        return `Ripgrep search failed: Ripgrep not found in container. Make sure ripgrep is installed. stderr: ${stderr}`
      }
      if (exitCode !== 0) {
        return `Ripgrep search failed: Unexpected ripgrep exit code: ${exitCode}. stderr: ${stderr}`
      }

      const perPage = maxChars
      const currentPage = page
      const start = (currentPage - 1) * perPage
      const end = start + perPage
      const output = stdout || ""
      if (start >= output.length) {
        return ""
      }
      let slice = output.slice(start, end)
      if (end < output.length) {
        slice += `\n[...truncated. Use page ${currentPage + 1} to continue.]`
      }
      return slice || "No matching results found."
    } catch (error) {
      return `Ripgrep search failed: ${String(error)}`
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
