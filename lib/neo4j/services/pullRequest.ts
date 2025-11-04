import { ManagedTransaction } from "neo4j-driver"

import { n4j } from "@/lib/neo4j/client"
import {
  linkEventCreatedPR,
  upsertPullRequest,
} from "@/lib/neo4j/repositories/pullRequest"

function deriveRepoFullNameFromUrl(url: string): string | null {
  // Expected formats:
  // - https://github.com/owner/repo/pull/123
  // - http://github.com/owner/repo/pull/123
  try {
    const u = new URL(url)
    if (u.hostname !== "github.com") return null
    const parts = u.pathname.split("/").filter(Boolean)
    // [owner, repo, 'pull', number]
    if (parts.length >= 4 && parts[2] === "pull") {
      const owner = parts[0]
      const repo = parts[1]
      if (owner && repo) return `${owner}/${repo}`
    }
    return null
  } catch {
    return null
  }
}

export async function upsertCreatedPullRequestFromToolResult({
  eventId,
  repoFullName,
  url,
  number,
  title,
}: {
  eventId: string
  repoFullName?: string | null
  url: string
  number: number
  title?: string | null
}) {
  const session = await n4j.getSession()
  try {
    const finalRepoFullName =
      repoFullName || deriveRepoFullNameFromUrl(url) || undefined
    if (!finalRepoFullName) return // cannot upsert without repo context

    await session.executeWrite(async (tx: ManagedTransaction) => {
      await upsertPullRequest(tx, {
        repoFullName: finalRepoFullName,
        number,
        url,
        title,
      })
      await linkEventCreatedPR(tx, {
        eventId,
        repoFullName: finalRepoFullName,
        number,
      })
    })
  } finally {
    await session.close()
  }
}

