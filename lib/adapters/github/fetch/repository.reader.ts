import { err, ok, type Result } from "shared/entities/result"
import type {
  GetRepositoryErrors,
  Repo,
  RepoDetails,
  RepositoryReaderPort,
} from "shared/ports/github/repository.reader"

/**
 * Fetch-based adapter for RepositoryReaderPort that talks directly to GitHub REST API.
 * Requires a GitHub access token (OAuth user or installation token).
 */
export function makeFetchRepositoryReaderAdapter(params: {
  token: string
  userAgent?: string
}): RepositoryReaderPort {
  const { token, userAgent = "Issue To PR/1.0.0 (https://issuetopr.dev)" } =
    params

  const baseHeaders = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": userAgent,
  }

  function mapStatusToError(
    status: number,
    body?: unknown
  ): GetRepositoryErrors {
    if (status === 401) return "AuthRequired"
    if (status === 404) return "RepoNotFound"
    if (status === 429) return "RateLimited"
    if (status === 403) {
      const msg =
        typeof body === "object" && body && "message" in body
          ? String(body.message ?? "")
          : ""
      return /rate\s*limit/i.test(msg) ? "RateLimited" : "Forbidden"
    }
    return "Unknown"
  }

  async function getRepo(
    repository: Repo
  ): Promise<
    Result<
      RepoDetails,
      "AuthRequired" | "RepoNotFound" | "Forbidden" | "RateLimited" | "Unknown"
    >
  > {
    const [owner, repo] = repository.fullName.split("/")
    if (!owner || !repo) return err("RepoNotFound")

    try {
      const url = `https://api.github.com/repos/${owner}/${repo}`
      const res = await fetch(url, { headers: baseHeaders })

      if (!res.ok) {
        let body: unknown
        try {
          body = await res.json()
        } catch {
          // ignore parse error
        }
        return err(mapStatusToError(res.status, body), body)
      }

      const data = await res.json()

      const visibility = (
        data.visibility || (data.private ? "private" : "public")
      )
        .toString()
        .toUpperCase() as "PUBLIC" | "PRIVATE" | "INTERNAL"

      const details: RepoDetails = {
        fullName: repository.fullName,
        owner: data?.owner?.login ?? owner,
        name: data?.name ?? repo,
        description: data?.description ?? null,
        defaultBranch: data?.default_branch ?? "main",
        visibility,
        url: data?.html_url ?? `https://github.com/${owner}/${repo}`,
        cloneUrl: data?.clone_url ?? `https://github.com/${owner}/${repo}.git`,
      }

      return ok(details)
    } catch (e) {
      console.error("[fetch/repository] Unexpected error", e)
      return err("Unknown", e)
    }
  }

  async function listUserAccessibleRepoFullNames(): Promise<
    Result<
      string[],
      "AuthRequired" | "RepoNotFound" | "Forbidden" | "RateLimited" | "Unknown"
    >
  > {
    try {
      // 1) List installations for the authenticated user
      const instRes = await fetch("https://api.github.com/user/installations", {
        headers: baseHeaders,
      })

      if (!instRes.ok) {
        let body: unknown
        try {
          body = await instRes.json()
        } catch {
          // ignore parse error
        }
        return err(mapStatusToError(instRes.status, body), body)
      }

      const instBody = (await instRes.json()) as {
        installations?: Array<{ id: number }>
      }

      const installations = instBody.installations ?? []
      if (installations.length === 0) return ok([])

      // 2) For each installation, list repositories (first page, 100 per page)
      const repoLists = await Promise.all(
        installations.map(async (inst) => {
          try {
            const url = `https://api.github.com/user/installations/${inst.id}/repositories?per_page=100`
            const repoRes = await fetch(url, { headers: baseHeaders })
            if (!repoRes.ok) {
              // Best-effort: skip this installation if it errors
              return [] as string[]
            }
            const repoBody = (await repoRes.json()) as {
              repositories?: Array<{ full_name?: string }>
            }
            return (repoBody.repositories
              ?.map((r) => r.full_name)
              .filter(Boolean) ?? []) as string[]
          } catch {
            return [] as string[]
          }
        })
      )

      // 3) Deduplicate while preserving order
      const seen = new Set<string>()
      const unique: string[] = []
      for (const name of repoLists.flat()) {
        if (name && !seen.has(name)) {
          seen.add(name)
          unique.push(name)
        }
      }

      return ok(unique)
    } catch (e) {
      console.error("[fetch/repositories] Unexpected error", e)
      return err("Unknown", e)
    }
  }

  return { getRepo, listUserAccessibleRepoFullNames }
}
