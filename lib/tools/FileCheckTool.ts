import { exec } from "child_process"
import { promisify } from "util"
import { z } from "zod"

import { execInContainer } from "@/lib/docker"
import { createTool } from "@/lib/tools/helper"
import { asRepoEnvironment, RepoEnvironment, Tool } from "@/lib/types"

// Input schema (what the LLM Agent provides)
const fileCheckParameters = z.object({
  cliCommand: z
    .string()
    .describe(
      "Full CLI command to run a READ-ONLY code-quality check (eslint, tsc, prettier, etc.). The command must not mutate code (no --fix, --write, etc.). Include the file path(s) to check when applicable. Multi-line commands not allowed."
    ),
})

const execPromise = promisify(exec)

async function handler(
  env: RepoEnvironment,
  params: z.infer<typeof fileCheckParameters>
) {
  const { cliCommand } = params

  // Reject multi-line commands early. Only single-line commands are allowed.
  if (/\r|\n/.test(cliCommand)) {
    return {
      stdout: "",
      stderr: "Multi-line commands are not allowed.",
      exitCode: 1,
    }
  }

  // Basic sanitisation to remove potentially dangerous characters (except space and tab).
  const sanitizedCommand = cliCommand.replace(/[^\p{L}\p{N}_\-.:/\\ \t]/gu, "")

  try {
    if (env.kind === "host") {
      const { stdout, stderr } = await execPromise(sanitizedCommand, {
        cwd: env.root,
        maxBuffer: 1024 * 1024,
      })
      return { stdout, stderr, exitCode: 0 }
    } else {
      const { stdout, stderr, exitCode } = await execInContainer({
        name: env.name,
        command: sanitizedCommand,
      })
      return { stdout, stderr, exitCode }
    }
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

// Overloaded function signatures for backwards compatibility
/**
 * @deprecated Use dockerized version with `env: RepoEnvironment` params instead
 */
export function createFileCheckTool(
  baseDir: string
): Tool<
  typeof fileCheckParameters,
  { stdout: string; stderr: string; exitCode: number }
>
export function createFileCheckTool(
  env: RepoEnvironment
): Tool<
  typeof fileCheckParameters,
  { stdout: string; stderr: string; exitCode: number }
>
export function createFileCheckTool(
  arg: string | RepoEnvironment
): Tool<
  typeof fileCheckParameters,
  { stdout: string; stderr: string; exitCode: number }
> {
  const env = asRepoEnvironment(arg)
  return createTool({
    name: "file_check",
    description: `
      Run a READ-ONLY code-quality CLI command (e.g., eslint, tsc, prettier) on specified file(s).
      The agent MUST:
      1. Provide the full CLI command in '\''cliCommand'\''.
      2. Only use commands that check code; NEVER use other types of CLI commands.
      3. Derive the command from the project'\''s existing scripts/config when possible.
      NOTE: If this check fails due to missing dependencies, you may need to run the SetupRepoTool first to install packages or set up your environment.
    `,
    schema: fileCheckParameters,
    handler: (params: z.infer<typeof fileCheckParameters>) =>
      handler(env, params),
    // The handler already conforms to fileCheckResult shape.
  })
}
