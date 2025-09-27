import { Octokit } from "@octokit/rest"

import { err, ok, type Result } from "@/entities/result"
import type {
  GetRepositoryErrors,
  RepositoryDetails,
  RepositoryReaderPort,
  RepositoryRef,
} from "@/ports/github/repository.reader"

/**
 * Factory to create a REST-based GitHub adapter implementing RepositoryReaderPort.
 */
export function makeRepositoryReaderAdapter(params: {
  token: string
}): RepositoryReaderPort {
  const octokit = new Octokit({ auth: params.token })

  async function getRepository(
    ref: RepositoryRef
  ): Promise<Result<RepositoryDetails, GetRepositoryErrors>> {
    const [owner, repo] = ref.repoFullName.split("/")
    if (!owner || !repo) return err("RepoNotFound")

    try {
      const { data } = await octokit.repos.get({ owner, repo })

      const visibility = (
        data.visibility || (data.private ? "private" : "public")
      ).toUpperCase() as "PUBLIC" | "PRIVATE" | "INTERNAL"

      const details: RepositoryDetails = {
        repoFullName: ref.repoFullName,
        owner: data.owner?.login ?? owner,
        name: data.name ?? repo,
        description: data.description ?? null,
        defaultBranch: data.default_branch ?? "main",
        visibility,
        url: data.html_url ?? `https://github.com/${owner}/${repo}`,
        cloneUrl: data.clone_url ?? `https://github.com/${owner}/${repo}.git`,
      }

      return ok(details)
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
  }

  return { getRepository }
}

export default makeRepositoryReaderAdapter
