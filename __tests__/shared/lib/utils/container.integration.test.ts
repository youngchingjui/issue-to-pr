/**
 * Integration tests for createContainerizedWorkspace.
 * Requires: Docker daemon running, GitHub App credentials in env, `preview` Docker network.
 *
 * These tests verify the core container setup path that all workflows depend on
 * after removing the shared host temp directory (setupLocalRepository).
 *
 * Run with: pnpm test:services
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { execInContainerWithDockerode } from "@/shared/lib/docker"
import { createContainerizedWorkspace } from "@/shared/lib/utils/container"

// Override via env for CI. Default: a lightweight test repo with just a README.
const TEST_REPO = process.env.TEST_REPO_FULL_NAME || "youngchingjui/test-repo"
const TEST_BRANCH = "main"

// Ensure the Docker `preview` network exists before tests run.
// createContainerizedWorkspace attaches containers to this network.
async function ensurePreviewNetwork() {
  const Docker = (await import("dockerode")).default
  const docker = new Docker({ socketPath: "/var/run/docker.sock" })
  try {
    await docker.getNetwork("preview").inspect()
  } catch {
    await docker.createNetwork({ Name: "preview", Driver: "bridge" })
  }
}

// Collect containers to clean up even if a test fails
type WorkspaceResult = Awaited<ReturnType<typeof createContainerizedWorkspace>>
const containersToCleanup: WorkspaceResult[] = []

beforeAll(async () => {
  await ensurePreviewNetwork()
}, 30_000)

afterAll(async () => {
  // Best-effort cleanup of any containers created during tests
  for (const result of containersToCleanup) {
    try {
      await result.cleanup()
    } catch {
      // ignore — container may already be removed
    }
  }
}, 60_000)

describe("createContainerizedWorkspace (no hostRepoPath)", () => {
  it("clones the repo inside the container and checks out the correct branch", async () => {
    const result = await createContainerizedWorkspace({
      repoFullName: TEST_REPO,
      branch: TEST_BRANCH,
    })
    containersToCleanup.push(result)

    // Verify the container has a valid git repo at /workspace
    const { stdout: isRepo, exitCode: repoCheck } =
      await execInContainerWithDockerode({
        name: result.containerName,
        command: "git rev-parse --is-inside-work-tree",
        cwd: "/workspace",
      })
    expect(repoCheck).toBe(0)
    expect(isRepo.trim()).toBe("true")

    // Verify the correct branch is checked out
    const { stdout: branchName } = await execInContainerWithDockerode({
      name: result.containerName,
      command: "git rev-parse --abbrev-ref HEAD",
      cwd: "/workspace",
    })
    expect(branchName.trim()).toBe(TEST_BRANCH)

    // Verify cleanup works
    await result.cleanup()
    // Remove from cleanup list since we already cleaned up
    const idx = containersToCleanup.indexOf(result)
    if (idx !== -1) containersToCleanup.splice(idx, 1)
  }, 60_000)

  it("three concurrent setups for the same repo all succeed independently", async () => {
    // This is the exact scenario that caused the production race condition.
    // Before the fix, concurrent jobs shared /tmp/git-repos/{owner}/{repo} on the host,
    // causing git index.lock conflicts and ENOENT errors.
    const results = await Promise.all([
      createContainerizedWorkspace({
        repoFullName: TEST_REPO,
        branch: TEST_BRANCH,
      }),
      createContainerizedWorkspace({
        repoFullName: TEST_REPO,
        branch: TEST_BRANCH,
      }),
      createContainerizedWorkspace({
        repoFullName: TEST_REPO,
        branch: TEST_BRANCH,
      }),
    ])
    containersToCleanup.push(...results)

    // All 3 should have different container names
    const names = results.map((r) => r.containerName)
    expect(new Set(names).size).toBe(3)

    // All 3 should have a valid git repo at /workspace
    for (const result of results) {
      const { stdout, exitCode } = await execInContainerWithDockerode({
        name: result.containerName,
        command: "git rev-parse --is-inside-work-tree",
        cwd: "/workspace",
      })
      expect(exitCode).toBe(0)
      expect(stdout.trim()).toBe("true")
    }

    // Write a unique file in each container and verify isolation
    for (let i = 0; i < results.length; i++) {
      await execInContainerWithDockerode({
        name: results[i].containerName,
        command: `echo "container-${i}" > /workspace/marker-${i}.txt`,
        cwd: "/workspace",
      })
    }

    // Each container should only have its own marker file
    for (let i = 0; i < results.length; i++) {
      const { exitCode: hasOwn } = await execInContainerWithDockerode({
        name: results[i].containerName,
        command: `test -f /workspace/marker-${i}.txt`,
        cwd: "/workspace",
      })
      expect(hasOwn).toBe(0)

      // Check that OTHER containers' markers don't exist here
      for (let j = 0; j < results.length; j++) {
        if (j === i) continue
        const { exitCode: hasOther } = await execInContainerWithDockerode({
          name: results[i].containerName,
          command: `test -f /workspace/marker-${j}.txt`,
          cwd: "/workspace",
        })
        expect(hasOther).not.toBe(0)
      }
    }

    // Cleanup
    for (const result of results) {
      await result.cleanup()
      const idx = containersToCleanup.indexOf(result)
      if (idx !== -1) containersToCleanup.splice(idx, 1)
    }
  }, 120_000)

  it("git credentials work inside the container (can reach remote)", async () => {
    const result = await createContainerizedWorkspace({
      repoFullName: TEST_REPO,
      branch: TEST_BRANCH,
    })
    containersToCleanup.push(result)

    // git ls-remote requires working credentials to reach a private repo,
    // and for a public repo it still validates the credential helper doesn't break.
    // This tests the boundary: container → GitHub API via git protocol.
    const { stdout, exitCode } = await execInContainerWithDockerode({
      name: result.containerName,
      command: "git ls-remote origin HEAD",
      cwd: "/workspace",
    })
    expect(exitCode).toBe(0)
    // Output should contain a SHA followed by HEAD
    expect(stdout).toMatch(/^[0-9a-f]{40}\s+HEAD/)

    await result.cleanup()
    const idx = containersToCleanup.indexOf(result)
    if (idx !== -1) containersToCleanup.splice(idx, 1)
  }, 60_000)
})
