import type { Endpoints } from "@octokit/types"
import { err, ok, type Result } from "shared/entities/result"
import type {
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
})

const UserInstallationsSchema: z.ZodType<UserInstallations> = z.object({
  installations: z.array(z.object({ id: z.number() })),
})

const InstallationReposSchema: z.ZodType<InstallationRepos> = z.object({
  repositories: z.array(z.object({ full_name: z.string() })),
})

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
      const res = await fetch(url, {
        headers: baseHeaders,
        next: { revalidate: 60, tags: ["repo", repository.fullName] },
      })

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
      const installationResponse = await fetch(
        "https://api.github.com/user/installations",
        {
          headers: baseHeaders,
          next: { revalidate: 60, tags: ["user-installations"] },
        }
      )

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
