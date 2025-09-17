import { Integer, ManagedTransaction, Node } from "neo4j-driver"

import { Labels } from "@/lib/neo4j/labels"
import { GlobalSettings, globalSettingsSchema } from "@/lib/types/db/neo4j"

// Fetch global/app-level settings stored on a singleton Settings node
export async function getGlobalSettings(
  tx: ManagedTransaction
): Promise<GlobalSettings | null> {
  const result = await tx.run<{
    s: Node<Integer, GlobalSettings, "Settings">
  }>(
    `
    MATCH (s:${Labels.Settings} {id: 'global'})
    RETURN s
    LIMIT 1
    `
  )
  const settings = result.records[0]?.get("s")?.properties
  if (!settings || Object.keys(settings).length === 0) return null
  return globalSettingsSchema.parse(settings)
}

// Upsert global settings
export async function setGlobalSettings(
  tx: ManagedTransaction,
  settings: Omit<GlobalSettings, "lastUpdated">
): Promise<void> {
  await tx.run(
    `
    MERGE (s:${Labels.Settings} {id: 'global'})
    SET s += $settings,
        s.lastUpdated = datetime()
    `,
    { settings }
  )
}

// Convenience helpers for specific fields
export async function getDemoOpenAIApiKey(
  tx: ManagedTransaction
): Promise<string | null> {
  const current = await getGlobalSettings(tx)
  const key = current?.demoOpenAIApiKey?.trim()
  return key && key.length > 0 ? key : null
}

export async function setDemoOpenAIApiKey(
  tx: ManagedTransaction,
  key: string
): Promise<void> {
  await setGlobalSettings(tx, { demoOpenAIApiKey: key })
}

export async function deleteDemoOpenAIApiKey(
  tx: ManagedTransaction
): Promise<void> {
  await tx.run(
    `
    MERGE (s:${Labels.Settings} {id: 'global'})
    REMOVE s.demoOpenAIApiKey
    SET s.lastUpdated = datetime()
    `
  )
}

