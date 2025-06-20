import { z } from "zod"
import { createTool } from "@/lib/tools/helper"
import { runInRepoContainer } from "@/lib/dockerExec"

const name = "ripgrep_search"
const description = `Searches for code in the local file system using ripgrep. Returns snippets of code containing the search term with 3 lines of context before and after each match. Note: These are just snippets - to fully understand the code's context, you should use a file reading tool to examine the complete file contents.

The tool supports both literal (fixed-string) and regex search modes. By default, search queries are treated as literal strings (no regex interpretation, safer). To enable regex matching, specify mode: "regex" in the parameters.
- mode: "literal" (default, safer) — uses ripgrep's -F flag, interprets search as a fixed string, safe for special characters like ?, *, [, ]
- mode: "regex" — disables -F, allows regex pattern searches, may return ripgrep errors if regex is malformed.`

const searchParameters = z.object({
  query: z.string().describe("The search query to use for searching code. Example: 'functionName' to find all occurrences of 'functionName' in the codebase."),
  ignoreCase: z.boolean().nullable().describe("Ignore case sensitivity. Default is false, meaning the search is case-sensitive. Use true to find matches regardless of case, e.g., 'function' will match 'Function'."),
  hidden: z.boolean().nullable().describe("Include hidden files. Default is false, meaning hidden files are ignored. Use true to include files like '.env'."),
  follow: z.boolean().nullable().describe("Follow symbolic links. Default is false, meaning symlinks are not followed. Use true to include files linked by symlinks in the search."),
  mode: z.enum(["literal", "regex"]).optional().describe('Search mode: "literal" (default, safer) or "regex"'),
})

type RipgrepSearchParameters = z.infer<typeof searchParameters>

function shellEscapeSingleQuotes(str: string): string {
  return "'" + str.replace(/'/g, "'\\''") + "'"
}

const fnHandler = async (baseDir: string, params: RipgrepSearchParameters) => {
  const { query, ignoreCase, hidden, follow, mode } = params

  const isIgnoreCase = ignoreCase ?? false
  const includeHidden = hidden ?? false
  const followSymlinks = follow ?? false
  const searchMode = mode ?? "literal"

  if (!query || typeof query !== "string" || query.length === 0) {
    throw new Error("Query string cannot be empty.")
  }

  const quotedQuery = shellEscapeSingleQuotes(query)
  let command = `rg --line-number --max-filesize 200K -C 3 --heading -n `
  if (searchMode === "literal") {
    command += "-F "
  }
  command += `${quotedQuery} ./`
  if (isIgnoreCase) command += " -i"
  if (includeHidden) command += " --hidden"
  if (followSymlinks) command += " -L"

  const repoFullName = (() => {
    const parts = baseDir.split(require("path").sep).filter(Boolean)
    return parts.slice(-2).join("/")
  })()
  const { stdout, stderr, code } = await runInRepoContainer(repoFullName, command, { cwd: "." })
  if (code === 1) return "No matching results found."
  if (code !== 0) throw new Error(stderr || `Ripgrep failed`)
  return stdout
}

export const createRipgrepSearchTool = (baseDir: string) =>
  createTool({
    name,
    description,
    schema: searchParameters,
    handler: (params: RipgrepSearchParameters) => fnHandler(baseDir, params),
  })
