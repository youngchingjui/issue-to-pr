import { Integer, ManagedTransaction, Node } from "neo4j-driver"

import { Labels } from "@/lib/neo4j/labels"
import {
  type BuildDeploymentSettings,
  buildDeploymentSettingsSchema,
  type RepoSettings,
  repoSettingsSchema,
} from "@/lib/types/db/neo4j"

// Get repository settings, with fallback for missing node or missing settings
export async function getRepositorySettings(
  tx: ManagedTransaction,
  repoFullName: string
): Promise<RepoSettings | null> {
  const result = await tx.run<{
    s: Node<Integer, RepoSettings, "Settings">
  }>(
    `
    MATCH (r:${Labels.Repository} {fullName: $repoFullName})-[:HAS_SETTINGS]->(s:${Labels.Settings})
    RETURN s
    LIMIT 1
    `,
    { repoFullName }
  )
  const settings = result.records[0]?.get("s")?.properties
  // If the settings node exists but has *no* properties, Neo4j returns an empty object ({}),
  // which is truthy in JavaScript. Treat this case the same as "no settings".
  if (!settings || Object.keys(settings).length === 0) return null
  return repoSettingsSchema.parse(settings)
}

// Set repository settings (stored on a separate RepoSettings node)
export async function setRepositorySettings(
  tx: ManagedTransaction,
  repoFullName: string,
  settings: Omit<RepoSettings, "lastUpdated">
): Promise<void> {
  // Exclude lastUpdated (if present) so we can pass the rest directly

  await tx.run(
    `
    MERGE (r:${Labels.Repository} {fullName: $repoFullName})-[:HAS_SETTINGS]->(s:${Labels.Settings})
    SET s += $settings,
        s.lastUpdated = datetime()
    `,
    { repoFullName, settings }
  )
}

// ---- Build & Deployment settings ----
export async function getBuildDeploymentSettings(
  tx: ManagedTransaction,
  repoFullName: string
): Promise<BuildDeploymentSettings | null> {
  const result = await tx.run<{
    s: Node<Integer, BuildDeploymentSettings, "Settings" | "BuildDeployment">
  }>(
    `
    MATCH (r:${Labels.Repository} {fullName: $repoFullName})-[:HAS_SETTINGS]->(s:${Labels.Settings}:${Labels.BuildDeployment})
    RETURN s
    LIMIT 1
    `,
    { repoFullName }
  )
  const settings = result.records[0]?.get("s")?.properties
  if (!settings || Object.keys(settings).length === 0) return null
  return buildDeploymentSettingsSchema.parse(settings)
}

export async function setBuildDeploymentSettings(
  tx: ManagedTransaction,
  repoFullName: string,
  settings: Omit<BuildDeploymentSettings, "lastUpdated">
): Promise<void> {
  await tx.run(
    `
    MERGE (r:${Labels.Repository} {fullName: $repoFullName})-[:HAS_SETTINGS]->(s:${Labels.Settings}:${Labels.BuildDeployment})
    SET s += $settings,
        s.lastUpdated = datetime()
    `,
    { repoFullName, settings }
  )
}
