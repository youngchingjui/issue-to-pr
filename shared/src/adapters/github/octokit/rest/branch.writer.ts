import { Octokit } from "@octokit/rest"

import { err, ok, type Result } from "@/entities/result"
import type {
  BranchRef,
  BranchWriterPort,
  CreateBranchErrors,
  CreateBranchInput,
} from "@/ports/github/branch.writer"

export function makeBranchWriterAdapter(params: {
  token: string
}): BranchWriterPort {
  const octokit = new Octokit({ auth: params.token })

  async function createBranch(
    input: CreateBranchInput
  ): Promise<Result<BranchRef, CreateBranchErrors>> {
    const [owner, repo] = input.repoFullName.split("/")
    if (!owner || !repo) return err("RepoNotFound")

    const base = input.baseBranch?.trim() || "main"

    // 1) Resolve base branch SHA
    let baseSha: string
    try {
      const { data } = await octokit.repos.getBranch({
        owner,
        repo,
        branch: base,
      })
      baseSha = data?.commit?.sha as string
      if (!baseSha)
        return err("Unknown", { message: "Missing base commit SHA" })
    } catch (e: unknown) {
      if (typeof e !== "object" || e === null) return err("Unknown")
      const anyErr = e as { status?: number; message?: string }
      if (anyErr.status === 404)
        return err("RepoNotFound", { message: anyErr.message })
      if (anyErr.status === 403)
        return err("Forbidden", { message: anyErr.message })
      if (anyErr.status === 401)
        return err("AuthRequired", { message: anyErr.message })
      if (anyErr.status === 429)
        return err("RateLimited", { message: anyErr.message })
      return err("Unknown", { message: anyErr.message })
    }

    // 2) Create the new ref
    try {
      const ref = `refs/heads/${input.branch}`
      await octokit.git.createRef({
        owner,
        repo,
        ref,
        sha: baseSha,
      })
      return ok<BranchRef>({ ref, sha: baseSha })
    } catch (e: unknown) {
      if (typeof e !== "object" || e === null) return err("Unknown")
      const anyErr = e as { status?: number; message?: string }
      if (anyErr.status === 422) {
        const msg = (anyErr.message ?? "").toLowerCase()
        if (msg.includes("reference already exists")) {
          return err("BranchAlreadyExists", { message: anyErr.message })
        }
        return err("ValidationFailed", { message: anyErr.message })
      }
      if (anyErr.status === 401)
        return err("AuthRequired", { message: anyErr.message })
      if (anyErr.status === 403)
        return err("Forbidden", { message: anyErr.message })
      if (anyErr.status === 404)
        return err("RepoNotFound", { message: anyErr.message })
      if (anyErr.status === 429)
        return err("RateLimited", { message: anyErr.message })
      return err("Unknown", { message: anyErr.message })
    }
  }

  return { createBranch }
}

export default makeBranchWriterAdapter
