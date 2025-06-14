import { n4j } from "@/lib/neo4j/client"
import { RepoSettings, repoSettingsSchema } from "@/lib/types/db/neo4j"

// Get repository settings, with fallback for missing node or missing settings
export async function getRepositorySettings(
  repoFullName: string
): Promise<RepoSettings | null> {
  const session = await n4j.getSession()
  try {
    const result = await session.run(
      `
      MATCH (r:Repository {fullName: $repoFullName})-[:HAS_SETTINGS]->(s:RepoSettings)
      RETURN properties(s) AS settings
      LIMIT 1
      `,
      { repoFullName }
    )
    const settings = result.records[0]?.get("settings")
    if (!settings) return null
    return repoSettingsSchema.parse(settings)
  } finally {
    await session.close()
  }
}

// Set repository settings (stored on a separate RepoSettings node)
export async function setRepositorySettings(
  repoFullName: string,
  settings: RepoSettings
): Promise<void> {
  const session = await n4j.getSession()
  try {
    await session.run(
      `
      MATCH (r:Repository {fullName: $repoFullName})
      MERGE (r)-[:HAS_SETTINGS]->(s:RepoSettings)
      SET s += $settings
      `,
      { repoFullName, settings }
    )
  } finally {
    await session.close()
  }
}
