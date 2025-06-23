import fs from "fs"
import path from "path"
import { z } from "zod"

import { createTool } from "@/lib/tools/helper"

const setupParameters = z.object({}) // No params to start

type SetupStep = { command: string; required: boolean; info?: string }
type SetupSummary = {
  steps: SetupStep[]
  manualSteps: string[]
  warnings?: string[]
}

// Utility to check file existence
function fileExists(...segments: string[]): boolean {
  try {
    return fs.existsSync(path.join(...segments))
  } catch {
    return false
  }
}

async function handler(baseDir: string): Promise<SetupSummary> {
  const steps: SetupStep[] = []
  const manualSteps: string[] = []
  const warnings: string[] = []

  // 1. JS package manager detection
  const hasPnpm = fileExists(baseDir, "pnpm-lock.yaml")
  const hasYarn = fileExists(baseDir, "yarn.lock")
  const hasNpm = fileExists(baseDir, "package-lock.json")
  if ([hasPnpm, hasYarn, hasNpm].filter(Boolean).length > 1) {
    warnings.push(
      "More than one JS package manager detected. Using first found."
    )
  }
  if (hasPnpm) steps.push({ command: "pnpm install", required: true })
  else if (hasYarn) steps.push({ command: "yarn install", required: true })
  else if (hasNpm) steps.push({ command: "npm install", required: true })

  // 2. Docker Compose
  if (fileExists(baseDir, "docker", "docker-compose.yml")) {
    steps.push({
      command: "docker compose -f docker/docker-compose.yml up -d",
      required: false,
    })
  } else if (fileExists(baseDir, "docker-compose.yml")) {
    steps.push({ command: "docker compose up -d", required: false })
  }

  // 3. Custom start scripts
  if (fileExists(baseDir, "scripts", "start-services.sh")) {
    steps.push({ command: "sh scripts/start-services.sh", required: false })
  }

  // 4. Migration scripts
  if (fileExists(baseDir, "scripts", "migrations")) {
    // List .sh files in migrations dir
    const migDir = path.join(baseDir, "scripts", "migrations")
    let migrationScripts: string[] = []
    try {
      migrationScripts = fs.readdirSync(migDir).filter((f) => f.endsWith(".sh"))
    } catch {}
    for (const ms of migrationScripts) {
      steps.push({ command: `sh scripts/migrations/${ms}`, required: false })
    }
  }

  // 5. Manual steps from docs
  for (const docFile of [
    path.join(baseDir, "README.md"),
    path.join(baseDir, "docs", "setup", "getting-started.md"),
  ]) {
    if (fileExists(docFile)) {
      let txt = ""
      try {
        txt = fs.readFileSync(docFile, "utf8")
      } catch {}
      // crude parse for "export ", "Set the ", "manually ", "env":
      // Also handle indented code blocks and env var setting lines
      const matches = txt.match(
        /(^|\n)[ ]*(export [^\n]+|set the [^\n]+|manually [^\n]+|[Ee]nv\w*=.*)/g
      )
      if (matches) {
        manualSteps.push(...matches.map((m) => m.trim()).filter(Boolean))
      }
    }
  }

  return {
    steps,
    manualSteps,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

export const createSetupTool = (baseDir: string) =>
  createTool({
    name: "setup",
    description: `\n      Analyze the codebase, infer all required steps to set up and bootstrap a developer/prod environment, \n      and return a safe, **ordered** sequence of setup commands plus any human/manual instructions.\n      Only recommend package installation (pnpm/yarn/npm install), docker compose up, and safe shell scripts from the repo. \n      Parse README/docs for manual instructions. Do NOT suggest or permit arbitrary/untrusted bash.\n    `,
    schema: setupParameters,
    handler: () => handler(baseDir),
  })
