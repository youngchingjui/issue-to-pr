import path from "path"
import fs from "fs"
import util from "util"
import { exec } from "child_process"
import { z } from "zod"

import { writeFile } from "@/lib/fs"
import { createTool } from "@/lib/tools/helper"

const execAsync = util.promisify(exec)

const writeFileContentParameters = z.object({
  relativePath: z
    .string()
    .describe("The relative path of the file to write to"),
  content: z.string().describe("The content to write to the file"),
})

type WriteFileContentParams = z.infer<typeof writeFileContentParameters>

type EslintResult = {
  fixed: boolean,
  stdout: string,
  stderr: string,
  errors: string[],
  warning?: string,
}

default function isLintableFile(ext: string) {
  return [".js", ".jsx", ".ts", ".tsx"].includes(ext)
}

function hasEslintConfig(baseDir: string): boolean {
  // Check for .eslintrc.json
  const eslintrc = path.join(baseDir, ".eslintrc.json")
  if (fs.existsSync(eslintrc)) return true
  // Check for other possible config files if necessary
  // Check for eslintConfig in package.json
  const pkgPath = path.join(baseDir, "package.json")
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
      if (pkg.eslintConfig) return true
    } catch {}
  }
  return false
}

async function runEslintFix(filePath: string, baseDir: string): Promise<EslintResult> {
  try {
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
  } catch (error: any) {
    // If eslint not installed or fatal error
    if (
      error.message &&
      (error.message.includes("not found") || error.message.includes("ENOENT"))
    ) {
      return { fixed: false, stdout: "", stderr: error.message, errors: [], warning: "ESLint does not appear to be installed in this project." }
    }
    // Partial/fixable lint errors
    let stdout = error.stdout ?? ""
    let stderr = error.stderr ?? error.message ?? ""
    let errors = stdout ? stdout.trim().split("\n").filter(Boolean) : []
    return { fixed: false, stdout, stderr, errors }
  }
}

async function fnHandler(
  baseDir: string,
  params: WriteFileContentParams
): Promise<{ message: string; eslint?: EslintResult }> {
  const { relativePath, content } = params
  const fullPath = path.join(baseDir, relativePath)
  await writeFile(fullPath, content)

  const ext = path.extname(relativePath)
  const result: { message: string; eslint?: EslintResult } = {
    message: `File written successfully to ${relativePath}`,
  }
  if (isLintableFile(ext) && hasEslintConfig(baseDir)) {
    // Run ESLint (fix + error summary)
    const eslint = await runEslintFix(fullPath, baseDir)
    result.eslint = eslint
    if (eslint.warning) {
      result.message += ` (Warning: ${eslint.warning})`
    }
    if (!eslint.fixed && eslint.errors.length > 0) {
      result.message += `\nESLint errors remain:\n${eslint.errors.join("\n")}`
    } else if (eslint.fixed) {
      result.message += "\nAll auto-fixable ESLint issues fixed."
    }
  }
  return result
}

export const createWriteFileContentTool = (baseDir: string) =>
  createTool({
    name: "write_file",
    description: "Writes content to a file in the repository, and runs ESLint --fix if applicable.",
    schema: writeFileContentParameters,
    handler: (params: WriteFileContentParams) => fnHandler(baseDir, params),
  })
