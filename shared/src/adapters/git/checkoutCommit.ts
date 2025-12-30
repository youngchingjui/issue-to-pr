// shared/src/adapters/git/containerCheckoutCommit.ts
import { err, ok, type Result } from "@/entities/result"
import { execInContainerWithDockerode } from "@/lib/docker"
import type {
  CheckoutCommitErrors,
  CheckoutCommitInput,
  CheckoutCommitPort,
} from "@/ports/git/checkoutCommit"

export function makeContainerCheckoutCommitAdapter(
  workdir: string | undefined = "/workspace"
): CheckoutCommitPort {
  const exec = async (container: string, command: string | string[]) =>
    await execInContainerWithDockerode({
      name: container,
      command,
      cwd: workdir,
    })

  async function checkoutCommit(
    container: string,
    input: CheckoutCommitInput
  ): Promise<Result<void, CheckoutCommitErrors>> {
    const { sha, branch } = input

    try {
      // 1) Make sure we have the commit locally
      const fetchRes = await exec(container, [
        "git",
        "fetch",
        "origin",
        "--prune",
      ])
      if (fetchRes.exitCode !== 0) {
        return err("GitCommandFailed", {
          step: "fetch",
          stderr: fetchRes.stderr,
        } as never)
      }

      // 2) Verify the commit exists
      const revRes = await exec(container, [
        "git",
        "cat-file",
        "-e",
        `${sha}^{commit}`,
      ])
      if (revRes.exitCode !== 0) {
        return err("CommitNotFound")
      }

      // 3) Checkout the commit in detached mode
      const detachRes = await exec(container, [
        "git",
        "checkout",
        "--detach",
        sha,
      ])
      if (detachRes.exitCode !== 0) {
        return err("GitCommandFailed", {
          step: "checkout-detach",
          stderr: detachRes.stderr,
        } as never)
      }

      // 4) Create or reset the working branch at that commit (idempotent)
      const branchRes = await exec(container, ["git", "checkout", "-B", branch])
      if (branchRes.exitCode !== 0) {
        return err("GitCommandFailed", {
          step: "checkout-branch",
          stderr: branchRes.stderr,
        } as never)
      }

      return ok(undefined)
    } catch (e: unknown) {
      return err("Unknown", {
        message: e instanceof Error ? e.message : String(e),
      } as never)
    }
  }

  return { checkoutCommit }
}
