import { z } from "zod"
import { createTool } from "@/lib/tools/helper"
import { runInRepoContainer } from "@/lib/dockerExec"

const ALLOWED_COMMANDS = new Set<string>([
  "eslint","tsc","jshint","jslint","prettier","sonarjs",
  "pylint","flake8","pyflakes","mypy","black","isort","bandit","pydocstyle","pyright",
  "checkstyle","pmd","spotbugs","errorprone","sonarjava","archunit",
  "stylecop","fxcop","roslyn","sonarcsharp",
  "clang-tidy","cppcheck","cpplint","clang","coverity","splint",
  "golint","go","staticcheck","gosimple","errcheck","ineffassign","govet","revive",
  "rubocop","reek","brakeman","flog","flay",
  "phpcs","phpstan","psalm","phpmd",
  "swiftlint","swiftformat",
  "detekt","ktlint",
  "clippy","rustfmt","cargo","cargo-audit","cargo-deny",
  "scalastyle","scapegoat","wartremover","scalafix",
  "shellcheck","shfmt",
  "perlcritic","perltidy",
  "stylelint","htmlhint","csslint","lighthouse",
  "sqlfluff","sqlint","sqlcheck",
  "dartanalyzer","dart",
  "oclint","infer",
  "credo",
  "hlint",
  "luacheck",
  "lintr",
  "codenarc",
  "elvis",
  "ftnchek","fortranlint",
  "mlint",
  "verilator","vhdl-linter",
  "sonarqube","codacy","codeclimate","lgtm","deepsource",
])

const fileCheckParameters = z.object({
  cliCommand: z.string().describe("Full CLI command to run a READ-ONLY code-quality check (eslint, tsc, prettier, etc.). The command must not mutate code (no --fix, --write, etc.). Include the file path(s) to check when applicable. Multi-line commands not allowed.")
})

// The baseDir should be a subpath within the repo – repoFullName can be deduced
const handler = async (baseDir: string, params: z.infer<typeof fileCheckParameters>) => {
  const { cliCommand } = params
  if (/\r|\n/.test(cliCommand)) {
    return { stdout: "", stderr: "Multi-line commands are not allowed.", exitCode: 1 }
  }
  const firstToken = cliCommand.trim().split(/\s+/)[0]?.toLowerCase()
  if (!firstToken || !ALLOWED_COMMANDS.has(firstToken)) {
    return { stdout: "", stderr: "Command not allowed. Must be a read-only code-quality tool.", exitCode: 1 }
  }

  // Determine repoFullName from path (works as all code checkers operate in repo context)
  const repoFullName = (() => {
    const parts = baseDir.split(require("path").sep).filter(Boolean)
    return parts.slice(-2).join("/")
  })()

  const sanitizedCommand = cliCommand.replace(/[^a-zA-Z0-9_\-.:/\\ \t]/g, "")

  const { stdout, stderr, code } = await runInRepoContainer(repoFullName, sanitizedCommand, { cwd: "." })
  return { stdout, stderr, exitCode: code }
}

export const createFileCheckTool = (baseDir: string) =>
  createTool({
    name: "file_check",
    description: `Run a READ-ONLY code-quality CLI command (e.g., eslint, tsc, prettier) on specified file(s). The agent MUST: 1. Provide the full CLI command in 'cliCommand'. 2. Only use commands that check code; NEVER use other types of CLI commands. 3. Derive the command from the project's existing scripts/config when possible.`,
    schema: fileCheckParameters,
    handler: (params: z.infer<typeof fileCheckParameters>) => handler(baseDir, params),
  })
