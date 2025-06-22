import { exec } from "child_process"
import util from "util"

const execAsync = util.promisify(exec)

export type EslintResult = {
  fixed: boolean
  stdout: string
  stderr: string
  errors: string[]
  warning?: string
}

export function isLintableFile(ext: string) {
  return [".js", ".jsx", ".ts", ".tsx", ".md"].includes(ext)
}

export async function hasEslintConfig(baseDir: string): Promise<boolean> {
  try {
    await execAsync("pwd && npx eslint", { cwd: baseDir })
    return true
  } catch (e) {
    console.log(e)
    return false
  }
}

export async function runEslintFix(
  filePath: string,
  baseDir: string
): Promise<EslintResult> {
  try {
    // First, use local version of eslint
    const { stdout: out1, stderr: err1 } = await execAsync(`pnpm i eslint`, {
      cwd: baseDir,
    })
    console.log(out1, err1)

    // Run eslint with fix option, working from the repo root
    const { stdout, stderr } = await execAsync(
      `npx eslint --fix "${filePath}"`,
      { cwd: baseDir }
    )

    // Detect remaining errors by running eslint again but without --fix
    const { stdout: out2, stderr: err2 } = await execAsync(
      `npx eslint "${filePath}"`,
      { cwd: baseDir }
    )

    // Parse errors: if stdout contains lines, they're remaining errors
    const errors = out2 ? out2.trim().split("\n").filter(Boolean) : []
    return { fixed: errors.length === 0, stdout: out2, stderr: err2, errors }
  } catch (error: unknown) {
    // If eslint not installed or fatal error
    if (
      error instanceof Error &&
      (error.message.includes("not found") || error.message.includes("ENOENT"))
    ) {
      return {
        fixed: false,
        stdout: "",
        stderr: error.message,
        errors: [],
        warning: "ESLint does not appear to be installed in this project.",
      }
    }

    // Partial/fixable lint errors
    const stdout = (error as { stdout?: string }).stdout ?? ""
    const stderr =
      (error as { stderr?: string }).stderr ?? (error as Error)?.message ?? ""
    const errors = stdout ? stdout.trim().split("\n").filter(Boolean) : []
    return { fixed: false, stdout, stderr, errors }
  }
}
