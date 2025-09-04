import { ManagedTransaction } from "neo4j-driver"

import { Labels } from "@/lib/neo4j/labels"

/**
 * Store and retrieve application-level shared settings (singleton).
 * We reuse the Settings label with type: "shared".
 */
export async function setSharedOpenAIApiKey(
  tx: ManagedTransaction,
  apiKey: string
): Promise<void> {
  await tx.run(
    `
    MERGE (s:${Labels.Settings} {type: "shared"})
    SET s.openAIApiKey = $apiKey,
        s.lastUpdated = datetime()
    `,
    { apiKey }
  )
}

export async function getSharedOpenAIApiKey(
  tx: ManagedTransaction
): Promise<string | null> {
  const res = await tx.run<{ apiKey: string }>(
    `
    MATCH (s:${Labels.Settings} {type: "shared"})
    RETURN s.openAIApiKey as apiKey
    LIMIT 1
    `
  )
  const key = res.records[0]?.get("apiKey")
  return key && typeof key === "string" && key.trim().length > 0
    ? key
    : null
}

