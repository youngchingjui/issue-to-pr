import { z } from "zod"

import { execInContainer } from "@/lib/docker"
import { createTool } from "@/lib/tools/helper"
import { asRepoEnvironment, RepoEnvironment, Tool } from "@/lib/types"

// Input schema for setup commands
const setupRepoParameters = z.object({
  cliCommand: z
    .string()
    .describe(
      "Single-line shell command needed to set up the repository after cloning (e.g., npm install, pip install -r requirements.txt, poetry install, yarn, etc.)."
    ),
})

async function handler(
  env: RepoEnvironment,
  params: z.infer<typeof setupRepoParameters>
) {
  const { cliCommand } = params

  // Reject multi-line commands
  if (/\r|\n/.test(cliCommand)) {
    return {
      stdout: "",
      stderr:
        "Multi-line commands are not allowed. Only single-line setup commands.",
      exitCode: 1,
    }
  }

  try {
    if (env.kind === "host") {
      const { exec } = await import("child_process")
      const { promisify } = await import("util")
      const execPromise = promisify(exec)
      const { stdout, stderr } = await execPromise(cliCommand, {
        cwd: env.root,
        maxBuffer: 1024 * 1024,
      })
      return { stdout, stderr, exitCode: 0 }
    } else {
      // No additional escaping needed, as all escaping should be done by caller/tool if needed
      const { stdout, stderr, exitCode } = await execInContainer({
        name: env.name,
        command: cliCommand,
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
      stderr: err.stderr || err.message || "Setup command failed.",
      exitCode: typeof err.code === "number" ? err.code : 1,
    }
  }
}

export function createSetupRepoTool(
  arg: string | RepoEnvironment
): Tool<
  typeof setupRepoParameters,
  { stdout: string; stderr: string; exitCode: number }
> {
  const env = asRepoEnvironment(arg)
  return createTool({
    name: "setup_repo",
    description: `
      Run a repository setup CLI command (e.g., '\''npm install'\'', '\''pip install -r requirements.txt'\'', '\''poetry install'\'', etc.).
      PURPOSE: Use this tool to set up the repository environment (install dependencies, initialize environments, etc) so that you may successfully run the FileCheck tool. Some file check commands may require the repository to be set up first.
      GUIDELINES:
        1. READ files like README.md, package.json, requirements.txt before using this tool.
        2. ONLY use for setup commands—not for build, test, or code-quality checks.
        3. ONLY single-line commands are allowed.
    `,
    schema: setupRepoParameters,
    handler: (params: z.infer<typeof setupRepoParameters>) =>
      handler(env, params),
  })
}
