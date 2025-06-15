import { exec } from "child_process"
import { promisify } from "util"
import { z } from "zod"
import path from "path"

import { createTool } from "@/lib/tools/helper"

const execPromise = promisify(exec)

const LINT_TOOL_DESC = `
Runs the code linter (e.g., ESLint) for the workspace. Returns all lint messages, including errors and warnings. By default, runs 'npm run lint'. If a configuration or environment variable LINT_COMMAND is present, that command is run instead. Output may be truncated if excessively long.`

// For v1, no parameters are required but schema allows for future extensibility
const lintToolParameters = z.object({})

/**
 * Find the lint command to run:
 * - If process.env.LINT_COMMAND is set, use that.
 * - Else, use 'npm run lint'.
 * @returns {string}
 */
function getLintCommand(baseDir: string): string {
  if (process.env.LINT_COMMAND && process.env.LINT_COMMAND.trim() !== "") {
    return process.env.LINT_COMMAND.trim()
  }
  return "npm run lint"
}

const MAX_OUTPUT_LENGTH = 8000 // characters

export const createLintTool = (baseDir: string) =>
  createTool({
    name: "lint",
    description: LINT_TOOL_DESC,
    schema: lintToolParameters,
    handler: async (_params: z.infer<typeof lintToolParameters>) => {
      const lintCommand = getLintCommand(baseDir)
      try {
        const { stdout, stderr } = await execPromise(lintCommand, {
          cwd: baseDir,
          env: process.env,
          maxBuffer: 10 * 1024 * 1024, // 10MB for large outputs
        })
        let output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : "")
        let status: "ok" | "error" = "ok"
        if (/error/i.test(output) || /failed/i.test(output) || stderr) {
          status = "error"
        }
        // Limit excessive output
        if (output.length > MAX_OUTPUT_LENGTH) {
          const truncated = output.slice(0, MAX_OUTPUT_LENGTH)
          output = `${truncated}\n... (truncated, full output exceeded ${MAX_OUTPUT_LENGTH} chars)`
        }
        return {
          status,
          message: output,
        }
      } catch (e) {
        // execPromise throws if command fails (non-zero exit), so we want to capture all output anyway
        let errorMsg = ""
        if (e && typeof e === "object" && "stdout" in e && typeof e.stdout === "string") {
          errorMsg += e.stdout
        }
        if (e && typeof e === "object" && "stderr" in e && typeof e.stderr === "string") {
          errorMsg += `\nSTDERR:\n${e.stderr}`
        }
        if (!errorMsg) {
          errorMsg = e instanceof Error ? e.message : String(e)
        }
        // Limit output size
        if (errorMsg.length > MAX_OUTPUT_LENGTH) {
          const truncated = errorMsg.slice(0, MAX_OUTPUT_LENGTH)
          errorMsg = `${truncated}\n... (truncated, full output exceeded ${MAX_OUTPUT_LENGTH} chars)`
        }
        return {
          status: "error" as const,
          message: errorMsg,
        }
      }
    },
  })
