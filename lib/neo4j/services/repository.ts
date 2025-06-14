import { DateTime } from "neo4j-driver"

import * as repoRepo from "@/lib/neo4j/repositories/repository"
import { RepoSettings as AppRepoSettings } from "@/lib/types"
import {
  RepoSettings as DbRepoSettings,
  repoSettingsSchema as dbRepoSettingsSchema,
} from "@/lib/types/db/neo4j"

// Convert Neo4j temporal types -> JS primitives
export const toAppRepoSettings = (db: DbRepoSettings): AppRepoSettings => {
  return {
    ...db,
    lastUpdated: db.lastUpdated.toStandardDate(),
  }
}

// Convert JS primitives -> Neo4j temporal types
export const toDbRepoSettings = (app: AppRepoSettings): DbRepoSettings => {
  const db = {
    ...app,
    lastUpdated: DateTime.fromStandardDate(app.lastUpdated),
  } as DbRepoSettings
  // Ensure we satisfy db schema
  return dbRepoSettingsSchema.parse(db)
}

export async function getRepositorySettings(
  repoFullName: string
): Promise<AppRepoSettings | null> {
  const db = await repoRepo.getRepositorySettings(repoFullName)
  if (!db) return null
  return toAppRepoSettings(db)
}

export async function setRepositorySettings(
  repoFullName: string,
  settings: AppRepoSettings
): Promise<void> {
  const dbSettings = toDbRepoSettings(settings)
  await repoRepo.setRepositorySettings(repoFullName, dbSettings)
}
