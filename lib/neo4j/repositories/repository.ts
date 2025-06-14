import { RepoSettings, repoSettingsSchema } from "@/lib/types"
import { n4j } from "@/lib/neo4j/client"
import { ManagedTransaction, Session } from "neo4j-driver"

// Get repository settings, with fallback for missing node or missing settings
export async function getRepositorySettings(repoFullName: string): Promise<RepoSettings | null> {
  const session = await n4j.getSession()
  try {
    const result = await session.run(
      "MATCH (r:Repository {fullName: $repoFullName}) RETURN r.settings AS settings LIMIT 1",
      { repoFullName }
    )
    const settings = result.records[0]?.get("settings")
    if (settings) return repoSettingsSchema.parse(settings)
    return null
  } finally {
    await session.close()
  }
}

// Set repository settings
export async function setRepositorySettings(repoFullName: string, settings: RepoSettings): Promise<void> {
  const session = await n4j.getSession()
  try {
    await session.run(
      "MATCH (r:Repository {fullName: $repoFullName}) SET r.settings = $settings",
      { repoFullName, settings }
    )
  } finally {
    await session.close()
  }
}
