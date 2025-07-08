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

/**
 * Add a role or tag to a user's roles array property.
 * - Duplicates are not added.
 * - Case sensitive.
 * Returns updated roles array.
 */
export async function addRoleToUser(
  tx: ManagedTransaction,
  username: string,
  role: string
): Promise<string[]> {
  // Coalesces s.roles to [] if missing, adds only if not present.
  const res = await tx.run<{ roles: string[] }>(
    `
    MATCH (u:${Labels.User} {username: $username})-[:HAS_SETTINGS]->(s:${Labels.Settings})
    WITH s, coalesce(s.roles, []) AS roles
    WITH s, CASE WHEN $role IN roles THEN roles ELSE roles + $role END AS newRoles
    SET s.roles = newRoles
    RETURN s.roles AS roles
    `,
    { username, role }
  )
  return res.records[0]?.get("roles") ?? []
}

/**
 * Remove a role or tag from a user's roles array property.
 * Returns updated roles array.
 */
export async function removeRoleFromUser(
  tx: ManagedTransaction,
  username: string,
  role: string
): Promise<string[]> {
  // Handles empty/missing s.roles; removes any matches (case sensitive).
  const res = await tx.run<{ roles: string[] }>(
    `
    MATCH (u:${Labels.User} {username: $username})-[:HAS_SETTINGS]->(s:${Labels.Settings})
    WITH s, coalesce(s.roles, []) AS roles
    SET s.roles = [r IN roles WHERE r <> $role]
    RETURN s.roles AS roles
    `,
    { username, role }
  )
  return res.records[0]?.get("roles") ?? []
}

/**
 * Get all roles/tags for a user (may return [] if none or if user exists with no roles).
 */
export async function getUserRoles(
  tx: ManagedTransaction,
  username: string
): Promise<string[]> {
  const res = await tx.run<{ roles: string[] }>(
    `
    MATCH (u:${Labels.User} {username: $username})-[:HAS_SETTINGS]->(s:${Labels.Settings})
    RETURN coalesce(s.roles, []) as roles
    LIMIT 1
    `,
    { username }
  )
  return res.records[0]?.get("roles") ?? []
}

