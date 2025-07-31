import { NextRequest, NextResponse } from "next/server"

import { execInContainerWithDockerode } from "@/lib/docker"

export const dynamic = "force-dynamic"

/**
 * Derive the deterministic container name used by our workflow utilities.
 * Must stay in sync with the logic in ../index route.
 */
function containerNameForTrace(traceId: string): string {
  return `agent-${traceId}`.replace(/[^a-zA-Z0-9_.-]/g, "-")
}

/**
 * Execute a series of git commands inside the running container and return
 * structured information useful for surfacing in the UI. By convention the
 * repository lives at /workspace inside the container – this is where other
 * container-utilities (WriteFileTool, RipgrepSearchTool, etc.) operate – so
 * all commands are executed from that directory.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  const containerName = containerNameForTrace(params.workflowId)
  const workdir = "/workspace"

  // 1. Current branch (falls back to "unknown" on error)
  const branchRes = await execInContainerWithDockerode({
    name: containerName,
    command: "git rev-parse --abbrev-ref HEAD",
    cwd: workdir,
  })
  const currentBranch = branchRes.exitCode === 0 ? branchRes.stdout.trim() : "unknown"

  // 2. Status (porcelain to keep parsing simple)
  const statusRes = await execInContainerWithDockerode({
    name: containerName,
    command: "git status --porcelain",
    cwd: workdir,
  })
  const status = statusRes.exitCode === 0 ? statusRes.stdout.trim() : ""

  // 3. Diff against origin/main (stat summary) – ignore failures (e.g. branch missing)
  const diffStatRes = await execInContainerWithDockerode({
    name: containerName,
    command: "git fetch origin main --quiet || true && git diff --stat origin/main",
    cwd: workdir,
  })
  const diffStat = diffStatRes.exitCode === 0 ? diffStatRes.stdout.trim() : ""

  // 4. Full diff (may be large) – cap at 10,000 characters to avoid blowing up payload
  const diffRes = await execInContainerWithDockerode({
    name: containerName,
    command: "git diff origin/main",
    cwd: workdir,
  })
  let diff = diffRes.exitCode === 0 ? diffRes.stdout : ""
  const DIFF_LIMIT = 10000
  if (diff.length > DIFF_LIMIT) {
    diff = diff.slice(0, DIFF_LIMIT) + `\n... (truncated ${diff.length - DIFF_LIMIT} chars)`
  }

  return NextResponse.json({
    branch: currentBranch,
    status,
    diffStat,
    diff,
  })
}

