import { ManagedTransaction } from "neo4j-driver"
import { z } from "zod"
import { repoSettingsSchema, RepoSettings } from "@/lib/types"

/**
 * Get repository settings by repoFullName (owner/name).
 * Returns undefined if no settings found or repo does not exist.
 */
export async function getRepoSettings(
  tx: ManagedTransaction,
  repoFullName: string
): Promise<RepoSettings | undefined> {
  const result = await tx.run(
    `MATCH (r:Repository {repoFullName: $repoFullName}) RETURN r.settings AS settings LIMIT 1`,
    { repoFullName }
  )
  const record = result.records[0]
  if (!record) return undefined
  const settings = record.get("settings")
  if (!settings) return undefined
  // Validate with Zod
  return repoSettingsSchema.parse(settings)
}

/**
 * Create or update repository settings.
 * If the repository node does not exist, it is created.
 * Returns the updated settings.
 */
export async function createOrUpdateRepoSettings(
  tx: ManagedTransaction,
  repoFullName: string,
  input: RepoSettings
): Promise<RepoSettings> {
  // Validate input
  const safeInput = repoSettingsSchema.parse(input)
  const result = await tx.run(
    `MERGE (r:Repository {repoFullName: $repoFullName})
     SET r.settings = $settings
     RETURN r.settings AS settings`,
    { repoFullName, settings: safeInput }
  )
  const settings = result.records[0]?.get("settings")
  // Validate output
  return repoSettingsSchema.parse(settings)
}

/**
 * Delete repository settings by setting property to null.
 * If no repo found, does nothing.
 */
export async function deleteRepoSettings(
  tx: ManagedTransaction,
  repoFullName: string
): Promise<void> {
  await tx.run(
    `MATCH (r:Repository {repoFullName: $repoFullName})
     REMOVE r.settings`,
    { repoFullName }
  )
}