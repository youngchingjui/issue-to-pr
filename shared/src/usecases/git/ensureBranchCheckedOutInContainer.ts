import type { ContainerWritePort } from "@shared/ports/container/write"
import { err, ok, type Result } from "@shared/entities/result"
import type { GitCliError, GitErrorDetails } from "@shared/ports/git/errors"

interface Params {
  containerName: string
  /** Branch to ensure exists locally and is checked out */
  headRef: string
  /** Remote name to use (defaults to origin) */
  remote?: string
  /** Working directory inside container (defaults to /workspace) */
  cwd?: string
  /** If provided, set origin to this URL before fetching */
  setRemoteUrl?: string
}

interface Output {
  branch: string
}

/**
 * Idempotently ensure a branch is available and checked out inside a containerized git repo.
 * - Optionally sets the remote URL (useful for auth)
 * - Fetches remote refs for the target branch
 * - If the branch exists locally, checks it out and fast-forwards
 * - Otherwise, creates the branch from the remote tracking ref
 */
export async function ensureBranchCheckedOutInContainer(
  ports: { container: ContainerWritePort },
  params: Params
): Promise<Result<Output, GitCliError, GitErrorDetails>> {
  const remote = params.remote ?? "origin"
  const cwd = params.cwd ?? "/workspace"
  const { containerName, headRef } = params

  const run = async (command: string) =>
    await ports.container.executeCommand({
      containerName,
      command,
      workingDirectory: cwd,
    })

  // 1) Optionally set remote URL for auth
  if (params.setRemoteUrl) {
    const setRes = await run(
      `git remote set-url ${remote} "${params.setRemoteUrl}"`
    )
    if (setRes.exitCode !== 0) {
      return err("RemoteNotSet", {
        step: "set-remote-url",
        command: `git remote set-url ${remote} <redacted>`,
        exitCode: setRes.exitCode,
        stdout: setRes.stdout,
        stderr: setRes.stderr,
      })
    }
  }

  // 2) Verify repository looks valid
  const fsck = await run("git rev-parse --git-dir")
  if (fsck.exitCode !== 0) {
    return err("InvalidRepository", {
      step: "verify-repo",
      command: "git rev-parse --git-dir",
      exitCode: fsck.exitCode,
      stdout: fsck.stdout,
      stderr: fsck.stderr,
    })
  }

  // 3) Check remote branch existence first to give clearer error
  const lsRemote = await run(`git ls-remote --heads ${remote} ${headRef}`)
  if (lsRemote.exitCode !== 0) {
    const stderr = (lsRemote.stderr || "").toLowerCase()
    if (stderr.includes("auth") || stderr.includes("forbidden")) {
      return err("AuthFailed", {
        step: "ls-remote",
        command: `git ls-remote --heads ${remote} ${headRef}`,
        exitCode: lsRemote.exitCode,
        stdout: lsRemote.stdout,
        stderr: lsRemote.stderr,
      })
    }
    if (stderr.includes("not found") || stderr.includes("could not read")) {
      return err("RepositoryNotFound", {
        step: "ls-remote",
        command: `git ls-remote --heads ${remote} ${headRef}`,
        exitCode: lsRemote.exitCode,
        stdout: lsRemote.stdout,
        stderr: lsRemote.stderr,
      })
    }
    // Generic network failure
    return err("NetworkError", {
      step: "ls-remote",
      command: `git ls-remote --heads ${remote} ${headRef}`,
      exitCode: lsRemote.exitCode,
      stdout: lsRemote.stdout,
      stderr: lsRemote.stderr,
    })
  }
  const remoteHasBranch = (lsRemote.stdout || "").trim().length > 0
  if (!remoteHasBranch) {
    return err("BranchNotFound", {
      step: "ls-remote",
      command: `git ls-remote --heads ${remote} ${headRef}`,
      exitCode: lsRemote.exitCode,
      stdout: lsRemote.stdout,
      stderr: lsRemote.stderr,
    })
  }

  // 4) Fetch just the target branch
  const fetchRes = await run(`git fetch ${remote} ${headRef}`)
  if (fetchRes.exitCode !== 0) {
    return err("FetchFailed", {
      step: "fetch",
      command: `git fetch ${remote} ${headRef}`,
      exitCode: fetchRes.exitCode,
      stdout: fetchRes.stdout,
      stderr: fetchRes.stderr,
    })
  }

  // 5) Check if local branch exists
  const revParse = await run(`git rev-parse --verify ${headRef}`)
  if (revParse.exitCode !== 0) {
    // Create local branch from remote tracking
    const coCreate = await run(`git checkout -b ${headRef} ${remote}/${headRef}`)
    if (coCreate.exitCode !== 0) {
      return err("CheckoutFailed", {
        step: "checkout-create",
        command: `git checkout -b ${headRef} ${remote}/${headRef}`,
        exitCode: coCreate.exitCode,
        stdout: coCreate.stdout,
        stderr: coCreate.stderr,
      })
    }
  } else {
    // Checkout and fast-forward
    const co = await run(`git checkout -q ${headRef}`)
    if (co.exitCode !== 0) {
      return err("CheckoutFailed", {
        step: "checkout",
        command: `git checkout -q ${headRef}`,
        exitCode: co.exitCode,
        stdout: co.stdout,
        stderr: co.stderr,
      })
    }
    const pull = await run(`git pull --ff-only ${remote} ${headRef}`)
    if (pull.exitCode !== 0) {
      return err("CheckoutFailed", {
        step: "pull-ff-only",
        command: `git pull --ff-only ${remote} ${headRef}`,
        exitCode: pull.exitCode,
        stdout: pull.stdout,
        stderr: pull.stderr,
      })
    }
  }

  // 6) Return current branch for sanity
  const br = await run("git rev-parse --abbrev-ref HEAD")
  const currentBranch = br.exitCode === 0 ? br.stdout.trim() : headRef
  return ok({ branch: currentBranch })
}

