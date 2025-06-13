import { exec } from "child_process"
import { promisify } from "util"
import { promises as fs } from "fs"
import * as path from "path"
import { z } from "zod"
import { createTool } from "@/lib/tools/helper"

const execPromise = promisify(exec)

const installDependenciesSchema = z.object({
  mode: z.enum(["auto", "manual"]).optional().describe("Detect mode (auto/manual). Default is auto."),
  installCommand: z.string().optional().describe("Custom install command to run instead of auto-detection."),
})

type InstallDependenciesParams = z.infer<typeof installDependenciesSchema>

// Helper:
async function fileExists(file: string): Promise<boolean> {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}

const JS_FILE = "package.json"
const PNPM_LOCK = "pnpm-lock.yaml"
const YARN_LOCK = "yarn.lock"
const NPM_LOCK = "package-lock.json"
const PY_REQUIREMENTS = "requirements.txt"
const PY_PROJECT_TOML = "pyproject.toml"

async function detectInstalls(baseDir: string): Promise<
  { command: string; reason: string; foundFiles: string[] }[]
> {
  const foundFiles: string[] = []
  const cmds: { command: string; reason: string; foundFiles: string[] }[] = []

  // JS/TS
  if (await fileExists(path.join(baseDir, JS_FILE))) {
    foundFiles.push(JS_FILE)
    const pnpmLock = await fileExists(path.join(baseDir, PNPM_LOCK))
    const yarnLock = await fileExists(path.join(baseDir, YARN_LOCK))
    const npmLock = await fileExists(path.join(baseDir, NPM_LOCK))
    if (pnpmLock) {
      cmds.push({
        command: "pnpm i",
        reason: "Detected pnpm-lock.yaml for pnpm package manager.",
        foundFiles: [...foundFiles, PNPM_LOCK],
      })
    } else if (yarnLock) {
      cmds.push({
        command: "yarn install",
        reason: "Detected yarn.lock for Yarn package manager.",
        foundFiles: [...foundFiles, YARN_LOCK],
      })
    } else if (npmLock) {
      cmds.push({
        command: "npm i",
        reason: "Detected package-lock.json for npm.",
        foundFiles: [...foundFiles, NPM_LOCK],
      })
    } else {
      cmds.push({
        command: "npm i",
        reason: "Default: only package.json found, defaulting to npm.",
        foundFiles: [...foundFiles],
      })
    }
  }

  // Python
  if (await fileExists(path.join(baseDir, PY_REQUIREMENTS))) {
    foundFiles.push(PY_REQUIREMENTS)
    cmds.push({
      command:
        "python -m venv venv && " +
        (process.platform === "win32"
          ? "venv\\Scripts\\activate && "
          : ". venv/bin/activate && ") +
        "pip install -r requirements.txt",
      reason: "Detected requirements.txt for Python.",
      foundFiles: [...foundFiles, PY_REQUIREMENTS],
    })
  }

  if (await fileExists(path.join(baseDir, PY_PROJECT_TOML))) {
    foundFiles.push(PY_PROJECT_TOML)
    cmds.push({
      command: "pip install .",
      reason: "Detected pyproject.toml. Try: pip install . or poetry, if pyproject.toml uses poetry or pipenv, please adjust.",
      foundFiles: [...foundFiles, PY_PROJECT_TOML],
    })
  }

  return cmds
}

async function installHandler(baseDir: string, params: InstallDependenciesParams) {
  const mode = params.mode || "auto"
  const customCommand = params.installCommand?.trim()
  const attemptedCommands: string[] = []
  let output = ""
  let ok = false
  let error: string | undefined = undefined
  let heuristics: string[] = []

  if (mode === "manual" && customCommand) {
    attemptedCommands.push(customCommand)
    try {
      const { stdout, stderr } = await execPromise(customCommand, { cwd: baseDir })
      output = stdout + stderr
      ok = true
    } catch (e: any) {
      ok = false
      error = String(e.stderr || e.message || e)
      output = e.stdout + e.stderr || String(e)
    }
    return { ok, attemptedCommands, output, error, heuristics: ["manual mode"] }
  }

  // Auto mode
  const cmdObjs = await detectInstalls(baseDir)
  if (cmdObjs.length === 0) {
    return {
      ok: false,
      attemptedCommands: [],
      output: "",
      error: "No installable project files found (e.g., package.json, requirements.txt, pyproject.toml).",
      heuristics: ["no install files detected"],
    }
  }
  
  for (const { command, reason, foundFiles } of cmdObjs) {
    attemptedCommands.push(command)
    heuristics.push(reason + (foundFiles.length ? ` Files: ${foundFiles.join(", ")}` : ""))
    try {
      const { stdout, stderr } = await execPromise(command, { cwd: baseDir, shell: true })
      output += `# ${command}\n${stdout}${stderr}\n`
      ok = true
    } catch (e: any) {
      output += `# ${command}\n${e.stdout || ""}${e.stderr || e.message || e}\n`
      error = String(e.stderr || e.message || e)
      ok = false
      // Don't throw, move to the next
    }
  }

  return { ok, attemptedCommands, output, error, heuristics }
}

export const createInstallDependenciesTool = (baseDir: string) =>
  createTool({
    name: "install_dependencies",
    description:
      "Detects project language/package manager and installs required dependencies. Handles JS/TS (pnpm, npm, yarn), Python (requirements.txt, pyproject.toml). Optionally takes a command to run manually instead. Returns logs, error, attempted commands, and heuristics used.",
    schema: installDependenciesSchema,
    handler: (params: InstallDependenciesParams) => installHandler(baseDir, params),
  })
