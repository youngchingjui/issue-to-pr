import type {
  Integer,
  ManagedTransaction,
  Node,
  QueryResult,
} from "neo4j-driver"

import { llmProviderEnum } from "@/shared/lib/types"
import type { LLMProvider } from "@/shared/lib/types"

// Minimal shape required by SettingsReaderAdapter
export interface UserSettingsNode {
  openAIApiKey?: string | null
  anthropicApiKey?: string | null
  llmProvider?: LLMProvider | null
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
  const res: QueryResult<ResultRow> = await tx.run<ResultRow>(QUERY, {
    username,
  })
  const settings = res.records?.[0]?.get?.("s")?.properties as
    | UserSettingsNode
    | undefined
  if (!settings) return null
  const providerParsed = llmProviderEnum.safeParse(settings.llmProvider)
  return {
    openAIApiKey: settings.openAIApiKey ?? null,
    anthropicApiKey: settings.anthropicApiKey ?? null,
    llmProvider: providerParsed.success ? providerParsed.data : null,
  }
}
