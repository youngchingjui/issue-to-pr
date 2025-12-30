import type { Endpoints } from "@octokit/types"
import { err, ok, type Result } from "shared/entities/result"
import type {
  GetRepositoryErrors,
  Repo as RepositoryInput,
  RepoDetails,
  RepositoryReaderPort,
} from "shared/ports/github/repository.reader"
import { z } from "zod"

type GetRepoResponse =
  Endpoints["GET /repos/{owner}/{repo}"]["response"]["data"]
type GetUserInstallationsResponse =
  Endpoints["GET /user/installations"]["response"]["data"]
type GetInstallationReposResponse =
  Endpoints["GET /user/installations/{installation_id}/repositories"]["response"]["data"]

type Repo = {
  owner: { login: GetRepoResponse["owner"]["login"] }
  name: GetRepoResponse["name"]
  full_name: GetRepoResponse["full_name"]
  description: GetRepoResponse["description"]
  default_branch: GetRepoResponse["default_branch"]
  private: GetRepoResponse["private"]
  visibility: GetRepoResponse["visibility"]
  html_url: GetRepoResponse["html_url"]
  clone_url: GetRepoResponse["clone_url"]
  has_issues: GetRepoResponse["has_issues"]
}

type UserInstallations = {
  installations: Array<
    Pick<GetUserInstallationsResponse["installations"][number], "id">
  >
}

type InstallationRepos = {
  repositories: Array<
    Pick<GetInstallationReposResponse["repositories"][number], "full_name">
  >
}

// We create zod schemas for runtime validation of the API responses
const RepoSchema: z.ZodType<Repo> = z.object({
  owner: z.object({ login: z.string() }),
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable(),
  default_branch: z.string(),
  private: z.boolean(),
  visibility: z.string(),
  html_url: z.string(),
  clone_url: z.string(),
  has_issues: z.boolean(),
})

const UserInstallationsSchema: z.ZodType<UserInstallations> = z.object({
  installations: z.array(z.object({ id: z.number() })),
})

const InstallationReposSchema: z.ZodType<InstallationRepos> = z.object({
  repositories: z.array(z.object({ full_name: z.string() })),
})

function isRateLimited(res: Response, message?: string | null): boolean {
  if (res.status === 429) return true
  if (res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining")
    if (remaining === "0") return true
  }
  if (typeof message === "string" && /rate\s*limit/i.test(message)) return true
  return false
}

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

  async function getRepo(
    repository: RepositoryInput
  ): Promise<Result<RepoDetails, GetRepositoryErrors>> {
    const [owner, repo] = repository.fullName.split("/")
    if (!owner || !repo) return err("RepoNotFound")

    try {
      const url = `https://api.github.com/repos/${owner}/${repo}`
      const res = await fetch(url, {
        headers: baseHeaders,
        cache: "no-store",
      })

      if (!res.ok) {
        const retryAfter = res.headers.get("retry-after")

        if (res.status === 401)
          return err("AuthRequired", {
            status: res.status,
            message: res.statusText,
          })
        if (res.status === 404)
          return err("RepoNotFound", {
            status: res.status,
            message: res.statusText,
          })
        if (isRateLimited(res))
          return err("RateLimited", {
            status: res.status,
            message: res.statusText,
            retryAfter,
          })
        if (res.status === 403)
          return err("Forbidden", {
            status: res.status,
            message: res.statusText,
          })
        return err("Unknown", { status: res.status, message: res.statusText })
      }

      const repoData = RepoSchema.parse(await res.json())

      const visibility =
        (repoData.visibility?.toUpperCase() as
          | "PUBLIC"
          | "PRIVATE"
          | "INTERNAL") || "PUBLIC"

      const details: RepoDetails = {
        fullName: repoData.full_name,
        owner: repoData.owner.login,
        name: repoData.name,
        description: repoData.description ?? null,
        defaultBranch: repoData.default_branch,
        visibility,
        url: repoData.html_url,
        cloneUrl: repoData.clone_url,
        has_issues: repoData.has_issues,
      }

      return ok(details)
    } catch (e) {
      console.error("[fetch/repository] Unexpected error", e)
      return err("Unknown", e)
    }
  }

  async function listUserAccessibleRepoFullNames(): Promise<
    Result<string[], GetRepositoryErrors>
  > {
    try {
      // 1) List installations for the authenticated user
      const installationResponse = await fetch(
        "https://api.github.com/user/installations",
        {
          headers: baseHeaders,
          next: { revalidate: 60, tags: ["user-installations"] },
        }
      )

      if (!installationResponse.ok) {
        const retryAfter = installationResponse.headers.get("retry-after")

        if (installationResponse.status === 401)
          return err("AuthRequired", {
            status: installationResponse.status,
            message: installationResponse.statusText,
          })
        if (installationResponse.status === 404)
          return err("RepoNotFound", {
            status: installationResponse.status,
            message: installationResponse.statusText,
          })
        if (isRateLimited(installationResponse))
          return err("RateLimited", {
            status: installationResponse.status,
            message: installationResponse.statusText,
            retryAfter,
          })
        if (installationResponse.status === 403)
          return err("Forbidden", {
            status: installationResponse.status,
            message: installationResponse.statusText,
          })
        return err("Unknown", {
          status: installationResponse.status,
          message: installationResponse.statusText,
        })
      }

      const installationData = UserInstallationsSchema.parse(
        await installationResponse.json()
      )
      const installations = installationData.installations
      if (installations.length === 0) return ok([])

      // 2) For each installation, list repositories (first page, 100 per page)
      const repoLists = await Promise.all(
        installations.map(async (inst) => {
          try {
            const url = `https://api.github.com/user/installations/${inst.id}/repositories?per_page=100`
            const repositoryResponse = await fetch(url, {
              headers: baseHeaders,
              next: {
                revalidate: 60,
                tags: [
                  "user-installations",
                  inst.id.toString(),
                  "repositories",
                ],
              },
            })
            if (!repositoryResponse.ok) {
              console.error(
                "[fetch/repository] Error listing repositories for installation",
                {
                  status: repositoryResponse.status,
                  message: repositoryResponse.statusText,
                }
              )
              return [] as string[]
            }

            const repositoryData = InstallationReposSchema.parse(
              await repositoryResponse.json()
            )
            return repositoryData.repositories.map((r) => r.full_name)
          } catch (e) {
            console.error("[fetch/repository] Unexpected error", e)
            return []
          }
        })
      )

      return ok(repoLists.flat())
    } catch (e) {
      console.error("[fetch/repository] Unexpected error", e)
      return err("Unknown", e)
    }
  }

  return { getRepo, listUserAccessibleRepoFullNames }
}
