import { Integer, ManagedTransaction, Node } from "neo4j-driver"

import { Labels } from "@/lib/neo4j/labels"
import { UserSettings, userSettingsSchema } from "@/lib/types/db/neo4j"

export async function getUserSettings(
  tx: ManagedTransaction,
  username: string
): Promise<UserSettings | null> {
  const result = await tx.run<{
    s: Node<Integer, UserSettings, "Settings">
  }>(
    `
    MATCH (u:${Labels.User} {username: $username})-[:HAS_SETTINGS]->(s:${Labels.Settings})
    RETURN s
    LIMIT 1
    `,
    { username }
  )
  const settings = result.records[0]?.get("s")?.properties
  if (!settings || Object.keys(settings).length === 0) return null
  return userSettingsSchema.parse(settings)
}

export async function setUserSettings(
  tx: ManagedTransaction,
  username: string,
  settings: Omit<UserSettings, "lastUpdated">
): Promise<void> {
  await tx.run(
    `
    MERGE (u:${Labels.User} {username: $username})
    MERGE (u)-[:HAS_SETTINGS]->(s:${Labels.Settings})
    SET s += $settings,
        s.lastUpdated = datetime()
    `,
    { username, settings }
  )
}
