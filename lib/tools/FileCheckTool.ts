import { exec } from "child_process"
import { promisify } from "util"
import { z } from "zod"

import { execInContainer } from "@/lib/docker"
import { createTool } from "@/lib/tools/helper"
import { asRepoEnvironment, RepoEnvironment, Tool } from "@/lib/types"

// Allow-listed CLI commands that are considered safe, **read-only** code-quality tools.
// Grouped by language but flattened into a single Set for quick lookup.
const ALLOWED_COMMANDS = new Set<string>([
  // JavaScript / TypeScript
  "eslint",
  "tsc",
  "jshint",
  "jslint",
  "prettier",
  "sonarjs",
  // Python
  "pylint",
  "flake8",
  "pyflakes",
  "mypy",
  "black",
  "isort",
  "bandit",
  "pydocstyle",
  "pyright",
  // Java
  "checkstyle",
  "pmd",
  "spotbugs",
  "errorprone",
  "sonarjava",
  "archunit",
  // C# / .NET
  "stylecop",
  "fxcop",
  "roslyn",
  "sonarcsharp",
  // C / C++
  "clang-tidy",
  "cppcheck",
  "cpplint",
  "clang",
  "coverity",
  "splint",
  // Go
  "golint",
  "go",
  "staticcheck",
  "gosimple",
  "errcheck",
  "ineffassign",
  "govet",
  "revive",
  // Ruby
  "rubocop",
  "reek",
  "brakeman",
  "flog",
  "flay",
  // PHP
  "phpcs",
  "phpstan",
  "psalm",
  "phpmd",
  // Swift
  "swiftlint",
  "swiftformat",
  // Kotlin
  "detekt",
  "ktlint",
  // Rust
  "clippy",
  "rustfmt",
  "cargo",
  "cargo-audit",
  "cargo-deny",
  // Scala
  "scalastyle",
  "scapegoat",
  "wartremover",
  "scalafix",
  // Shell
  "shellcheck",
  "shfmt",
  // Perl
  "perlcritic",
  "perltidy",
  // HTML/CSS
  "stylelint",
  "htmlhint",
  "csslint",
  "lighthouse",
  // SQL
  "sqlfluff",
  "sqlint",
  "sqlcheck",
  // Dart
  "dartanalyzer",
  "dart",
  // Objective-C
  "oclint",
  "infer",
  // Elixir
  "credo",
  // Haskell
  "hlint",
  // Lua
  "luacheck",
  // R
  "lintr",
  // Groovy
  "codenarc",
  // Erlang
  "elvis",
  // Fortran
  "ftnchek",
  "fortranlint",
  // Matlab
  "mlint",
  // VHDL/Verilog
  "verilator",
  "vhdl-linter",
  // General / Multi-language
  "sonarqube",
  "codacy",
  "codeclimate",
  "lgtm",
  "deepsource",
])

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

  // Extract the first token (the command itself) to validate against allow-list.
  const firstToken = cliCommand.trim().split(/\s+/)[0]?.toLowerCase()

  if (!firstToken || !ALLOWED_COMMANDS.has(firstToken)) {
    return {
      stdout: "",
      stderr: "Command not allowed. Must be a read-only code-quality tool.",
      exitCode: 1,
    }
  }

  // Basic sanitisation to remove potentially dangerous characters (except space and tab).
  const sanitizedCommand = cliCommand.replace(/[^a-zA-Z0-9_\-.:/\\ \t]/g, "")

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
): Tool<typeof fileCheckParameters, { stdout: string; stderr: string; exitCode: number }>
export function createFileCheckTool(
  env: RepoEnvironment
): Tool<typeof fileCheckParameters, { stdout: string; stderr: string; exitCode: number }>
export function createFileCheckTool(
  arg: string | RepoEnvironment
): Tool<typeof fileCheckParameters, { stdout: string; stderr: string; exitCode: number }> {
  const env = asRepoEnvironment(arg)
  return createTool({
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
      handler(env, params),
    // The handler already conforms to fileCheckResult shape.
  })
}
