import { exec } from "child_process"
import { promisify } from "util"
import { z } from "zod"

import { createTool } from "@/lib/tools/helper"

// Input schema (what the LLM Agent provides)
const fileCheckParameters = z.object({
  cliCommand: z
    .string()
    .describe(
      "Full CLI command to run a READ-ONLY code-quality check (eslint, tsc, prettier, etc.). The command must not mutate code (no --fix, --write, etc.). Include the file path(s) to check when applicable."
    ),
})

const execPromise = promisify(exec)

// Allow list of substrings that can appear in cliCommand
const ALLOWED_BINS = ["eslint", "tsc", "prettier", "lint", "check"]

function isAllowedCommand(cmd: string): boolean {
  return ALLOWED_BINS.some((bin) => cmd.includes(bin))
}

async function handler(
  baseDir: string,
  params: z.infer<typeof fileCheckParameters>
) {
  const { cliCommand } = params

  if (!isAllowedCommand(cliCommand)) {
    return {
      stdout: "",
      stderr:
        "Command not allowed. Only code-quality commands (eslint, tsc, prettier, lint, check) are permitted.",
      exitCode: 1,
    }
  }

  // Basic sanitisation to remove potentially dangerous characters
  const sanitizedCommand = cliCommand.replace(/[^a-zA-Z0-9_\-.:/\s]/g, "")

  try {
    const { stdout, stderr } = await execPromise(sanitizedCommand, {
      cwd: baseDir,
      maxBuffer: 1024 * 1024,
    })

    return { stdout, stderr, exitCode: 0 }
  } catch (error: unknown) {
    if (!error || typeof error !== "object") {
      return {
        stdout: "",
        stderr: String(error ?? "Unknown error"),
        exitCode: -1,
      }
    }

    const err = error as {
      stdout?: string
      stderr?: string
      code?: number
      message?: string
    }

    return {
      stdout: err.stdout || "",
      stderr: err.stderr || err.message || "Code quality check failed.",
      exitCode: typeof err.code === "number" ? err.code : 1,
    }
  }
}

export const createFileCheckTool = (baseDir: string) =>
  createTool({
    name: "file_check",
    description: `
      Run a READ-ONLY code-quality CLI command (e.g., eslint, tsc, prettier) on specified file(s).
      The agent MUST:
      1. Provide the full CLI command in 'cliCommand'.
      2. Only use commands that check code; NEVER use other types of CLI commands.
      3. Derive the command from the project's existing scripts/config when possible.
    `,
    schema: fileCheckParameters,
    handler: (params: z.infer<typeof fileCheckParameters>) =>
      handler(baseDir, params),
    // The handler already conforms to fileCheckResult shape.
  })
