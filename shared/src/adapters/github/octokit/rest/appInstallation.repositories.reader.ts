import { Octokit } from "@octokit/rest"

import { err, ok, type Result } from "@/entities/result"
import type {
  AppInstallationRepositoriesReaderPort,
  ListUserAppInstallationReposErrors,
} from "@/ports/github/appInstallation.repositories.reader"

/**
 * REST-based adapter to list repositories under the current user's installations
 * that the user can access. Returns minimal data (full names) and de-duplicates results.
 */
export function makeAppInstallationReposReaderAdapter(params: {
  token: string
}): AppInstallationRepositoriesReaderPort {
  const octokit = new Octokit({ auth: params.token })

  const listUserAccessibleRepoFullNames: AppInstallationRepositoriesReaderPort["listUserAccessibleRepoFullNames"] =
    async (): Promise<
      Result<string[], ListUserAppInstallationReposErrors>
    > => {
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

  return { listUserAccessibleRepoFullNames }
}

export default makeAppInstallationReposReaderAdapter

