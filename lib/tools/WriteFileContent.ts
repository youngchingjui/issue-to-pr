import path from "path"
import { z } from "zod"

import {
  type EslintResult,
  hasEslintConfig,
  isLintableFile,
  runEslintFix,
} from "@/lib/cli/eslint"
import { writeFile } from "@/lib/fs"
import { createTool } from "@/lib/tools/helper"

const writeFileContentParameters = z.object({
  relativePath: z
    .string()
    .describe("The relative path of the file to write to"),
  content: z.string().describe("The content to write to the file"),
})

type WriteFileContentParams = z.infer<typeof writeFileContentParameters>

async function fnHandler(
  baseDir: string,
  params: WriteFileContentParams
): Promise<string> {
  const { relativePath, content } = params
  const fullPath = path.join(baseDir, relativePath)
  await writeFile(fullPath, content)

  const result: { message: string; eslint?: EslintResult } = {
    message: `File written successfully to ${relativePath}`,
  }
  const ext = path.extname(relativePath)
  if (isLintableFile(ext) && (await hasEslintConfig(baseDir))) {
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
  return JSON.stringify(result)
}

export const createWriteFileContentTool = (baseDir: string) =>
  createTool({
    name: "write_file",
    description:
      "Writes content to a file in the repository, and runs ESLint --fix if applicable.",
    schema: writeFileContentParameters,
    handler: (params: WriteFileContentParams) => fnHandler(baseDir, params),
  })
