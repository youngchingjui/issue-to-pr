import { Node, ManagedTransaction } from "neo4j-driver"
import { n4j } from "@/lib/neo4j/client"
import { User } from "@/lib/types/neo4j"

// Set or update encryptedOpenAIApiKey for User node
export async function setUserOpenAIApiKey(userId: string, encryptedKey: string): Promise<void> {
  const session = await n4j.getSession()
  try {
    await session.run(
      `MERGE (u:User {id: $userId})
       SET u.encryptedOpenAIApiKey = $encryptedKey`,
      { userId, encryptedKey }
    )
  } finally {
    await session.close()
  }
}

// Get encryptedOpenAIApiKey for User node
export async function getUserOpenAIApiKey(userId: string): Promise<string | null> {
  const session = await n4j.getSession()
  try {
    const result = await session.run<{ u: Node }>(
      `MATCH (u:User {id: $userId})
       RETURN u.encryptedOpenAIApiKey AS encryptedOpenAIApiKey
       LIMIT 1`,
      { userId }
    )
    const record = result.records[0]
    if (record) {
      return record.get("encryptedOpenAIApiKey") || null
    }
    return null
  } finally {
    await session.close()
  }
}
