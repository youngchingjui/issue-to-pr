import type { Integer, ManagedTransaction, Node, QueryResult } from "neo4j-driver"

// Minimal shape required by SettingsReaderAdapter
export interface UserSettingsNode {
  openAIApiKey?: string | null
}

interface ResultRow {
  s: Node<Integer, UserSettingsNode, "Settings">
}

const QUERY = `
  MATCH (u:User {username: $username})-[:HAS_SETTINGS]->(s:Settings)
  RETURN s
  LIMIT 1
`

/**
 * Fetches a user's settings node and returns a narrow settings shape.
 */
export async function getUserSettings(
  tx: ManagedTransaction,
  username: string
): Promise<UserSettingsNode | null> {
  const res: QueryResult<ResultRow> = await tx.run<ResultRow>(QUERY, { username })
  const settings = res.records?.[0]?.get?.("s")?.properties as UserSettingsNode | undefined
  if (!settings) return null
  return {
    openAIApiKey: settings.openAIApiKey ?? null,
  }
}

