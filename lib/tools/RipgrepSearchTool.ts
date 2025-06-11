import { exec } from "child_process"
import { promisify } from "util"
import { z } from "zod"

import { createTool } from "@/lib/tools/helper"

const execPromise = promisify(exec)

const name = "ripgrep_search"
const description = `Searches for code in the local file system using ripgrep. Returns snippets of code containing the search term with 3 lines of context before and after each match. Note: These are just snippets - to fully understand the code's context, you should use a file reading tool to examine the complete file contents.

The tool supports both literal (fixed-string) and regex search modes. By default, search queries are treated as literal strings (no regex interpretation, safer). To enable regex matching, specify mode: "regex" in the parameters.
- mode: "literal" (default, safer) — uses ripgrep's -F flag, interprets search as a fixed string, safe for special characters like ?, *, [, ]
- mode: "regex" — disables -F, allows regex pattern searches, may return ripgrep errors if regex is malformed.

Optionally, you can enable multiline search mode by setting 'multiline: true' in the parameters. This allows queries containing newlines or spanning multiple lines to match code using ripgrep's --multiline (-U) flag.`

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
  multiline: z
    .boolean()
    .nullable()
    .describe(
      "Enable multiline search mode: allows matching search terms that span multiple lines (enables ripgrep --multiline/-U flag). Default is false."
    ),
})

type RipgrepSearchParameters = z.infer<typeof searchParameters>

function shellEscapeSingleQuotes(str: string): string {
  // Replace every ' with '\'' and wrap the string in single quotes
  // This safely escapes single quotes for POSIX shells
  return "'" + str.replace(/'/g, "'\\''") + "'"
}

async function fnHandler(
  baseDir: string,
  params: RipgrepSearchParameters
): Promise<string> {
  const { query, ignoreCase, hidden, follow, mode, multiline } = params

  // Set default values if parameters are null
  const isIgnoreCase = ignoreCase ?? false
  const includeHidden = hidden ?? false
  const followSymlinks = follow ?? false
  const searchMode = mode ?? "literal" // backward compatibility to old calls
  const multilineMode = multiline ?? false

  if (!query || typeof query !== "string" || query.length === 0) {
    return "Error: Query string cannot be empty."
  }

  // Robustly escape the user's query for the shell
  const quotedQuery = shellEscapeSingleQuotes(query)

  // Construct ripgrep command
  let command = `cd "${baseDir}" && rg --line-number --max-filesize 200K -C 3 --heading -n `

  if (searchMode === "literal") {
    command += "-F " // use literal/fixed-string mode
  }

  if (multilineMode) {
    command += "-U " // enable multiline mode
  }

  command += `${quotedQuery} ./`

  if (isIgnoreCase) command += " -i"
  if (includeHidden) command += " --hidden"
  if (followSymlinks) command += " -L"

  try {
    const { stdout } = await execPromise(command)
    return stdout
  } catch (error: any) {
    // Ripgrep exit codes: 1=no matches, 2=error
    if (error && typeof error === "object" && "code" in error) {
      const code = error.code
      const stderr = error.stderr?.toString() || ""
      const message = error.message?.toString() || "Unknown error"

      if (code === 1) {
        return "No matching results found."
      }

      if (code === 2) {
        // Top guidance for problematic multiline literal regex errors
        let suggestion = ""
        if (
          stderr.includes('the literal "\\n" is not allowed in a regex') ||
          stderr.includes('not allowed in a regex')
        ) {
          suggestion =
            '\nSuggestion: Set the "multiline" parameter to true to enable multiline search mode.'
        }

        return `Ripgrep search failed: ${stderr || message}${suggestion}`
      }

      // Unexpected code, but return as string
      return `Ripgrep error (unexpected code ${code}): ${stderr || message}`
    }
    // Really unknown error (shouldn't happen)
    return `Ripgrep error (unexpected): ${error && error.toString ? error.toString() : JSON.stringify(error)}`
  }
}

export const createRipgrepSearchTool = (baseDir: string) =>
  createTool({
    name,
    description,
    schema: searchParameters,
    handler: (params: RipgrepSearchParameters) => fnHandler(baseDir, params),
  })
