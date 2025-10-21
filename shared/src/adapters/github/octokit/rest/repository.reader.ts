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

  async function listUserAccessibleRepoFullNames(): Promise<
    Result<string[], GetRepositoryErrors>
  > {
    try {
      // 1) Fetch installations for the authenticated user
      const { data: installationsResp } = await octokit.request(
        "GET /user/installations"
      )

      const installations = installationsResp.installations ?? []
      if (installations.length === 0) return ok([])

      // 2) For each installation, list repositories the user can access under that installation
      const allRepos = (
        await Promise.all(
          installations.map(async (inst) => {
            try {
              const { data } = await octokit.request(
                "GET /user/installations/{installation_id}/repositories",
                { installation_id: inst.id, per_page: 100 }
              )
              return data.repositories?.map((r) => r.full_name) ?? []
            } catch (e: unknown) {
              // Best-effort: skip this installation on error but continue others
              return [] as string[]
            }
          })
        )
      ).flat()

      // 3) Deduplicate results while preserving original order
      const seen = new Set<string>()
      const unique: string[] = []
      for (const name of allRepos) {
        if (!seen.has(name)) {
          seen.add(name)
          unique.push(name)
        }
      }

      return ok(unique)
    } catch (e: unknown) {
      let message: string | undefined
      let status: number | undefined
      const errObj = e as Record<string, unknown> | null
      if (errObj && typeof errObj === "object") {
        if (typeof errObj.message === "string") message = errObj.message
        if (typeof errObj.status === "number") status = errObj.status
        else if (
          errObj.response &&
          typeof (errObj.response as Record<string, unknown>).status ===
            "number"
        ) {
          status = (errObj.response as Record<string, unknown>).status as number
        }
      }

      if (status === 401 || status === 403)
        return err("AuthRequired", { status, message })
      if (typeof message === "string" && /rate\s*limit/i.test(message))
        return err("RateLimited", { message })

      return err("Unknown", { status, message })
    }
  }

  return { getRepository, listUserAccessibleRepoFullNames }
}

export default makeRepositoryReaderAdapter
