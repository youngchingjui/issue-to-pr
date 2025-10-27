import { err, ok, type Result } from "shared/entities/result"
import type {
  RepositoryDetails,
  RepositoryReaderPort,
  RepositoryRef,
} from "shared/ports/github/repository.reader"

/**
 * Fetch-based adapter for RepositoryReaderPort.
 * It calls our Next.js API routes to retrieve repository information.
 */
export function makeFetchRepositoryReaderAdapter(
  baseUrl: string = ""
): RepositoryReaderPort {
  async function getRepository(
    ref: RepositoryRef
  ): Promise<
    Result<
      RepositoryDetails,
      "AuthRequired" | "RepoNotFound" | "Forbidden" | "RateLimited" | "Unknown"
    >
  > {
    try {
      const res = await fetch(`${baseUrl}/api/github/repository`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fullName: ref.repoFullName }),
      })

      if (res.status === 401) return err("AuthRequired")
      if (res.status === 403) return err("Forbidden")
      if (res.status === 404) return err("RepoNotFound")
      if (res.status === 429) return err("RateLimited")

      if (!res.ok) return err("Unknown", await res.text())

      const data = (await res.json()) as RepositoryDetails
      return ok(data)
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
      const res = await fetch(`${baseUrl}/api/github/repositories`, {
        method: "GET",
        credentials: "include",
      })

      if (res.status === 401) return err("AuthRequired")
      if (res.status === 403) return err("Forbidden")
      if (res.status === 429) return err("RateLimited")

      if (!res.ok) return err("Unknown", await res.text())

      const data = (await res.json()) as { fullNames: string[] }
      return ok(data.fullNames)
    } catch (e) {
      console.error("[fetch/repository] Unexpected error", e)
      return err("Unknown", e)
    }
  }

  return { getRepository, listUserAccessibleRepoFullNames }
}
