"use server"

import { n4j } from "@/lib/neo4j/client"
import { neo4jToJs } from "@/lib/neo4j/convert"
import * as repoRepo from "@/lib/neo4j/repositories/repository"
import { RepoSettings as AppRepoSettings } from "@/lib/types"
import { RepoSettings as DbRepoSettings } from "@/lib/types/db/neo4j"
import { RepoFullName } from "@/lib/types/github"

// Convert Neo4j temporal types -> JS primitives
export const toAppRepoSettings = (db: DbRepoSettings): AppRepoSettings => {
  return neo4jToJs(db) as AppRepoSettings
}

export async function getRepositorySettings(
  repoFullName: RepoFullName
): Promise<AppRepoSettings | null> {
  const session = await n4j.getSession()
  try {
    const db = await session.executeRead((tx) =>
      repoRepo.getRepositorySettings(tx, repoFullName.fullName)
    )
    if (!db) return null
    return toAppRepoSettings(db)
  } finally {
    await session.close()
  }
}

export async function setRepositorySettings(
  repoFullName: RepoFullName,
  settings: AppRepoSettings
): Promise<void> {
  const session = await n4j.getSession()
  try {
    await session.executeWrite((tx) => {
      const { lastUpdated: _ignored, ...rest } = settings
      repoRepo.setRepositorySettings(tx, repoFullName.fullName, rest)
    })
  } finally {
    await session.close()
  }
}
