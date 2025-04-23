// Migration script: Merge Plan nodes into related LLMResponse/Event nodes with :Plan label in Neo4j
// Usage: ts-node scripts/neo4j-plan-merge-migration.ts
import { Neo4jClient } from "../lib/neo4j/client"

async function runMigration() {
  const client = Neo4jClient.getInstance()
  const session = await client.getSession()
  console.log("Starting Neo4j Plan merge migration...")
  try {
    // Step 1: Attach :Plan label + metadata to Event node, copy properties
    // Step 2: Delete obsolete Plan nodes
    // This will work for the model where Plan ->GENERATED_FROM->(e:Event)
    const cypher = `
      MATCH (p:Plan)-[:GENERATED_FROM]->(m:Event {type: "llm_response"})
      SET m:Plan,
          m.status = p.status,
          m.type = p.type,
          m.createdAt = p.createdAt,
          m.version = coalesce(p.version, "1"),
          m.approvalStatus = p.approvalStatus,
          m.editStatus = p.editStatus,
          m.previousVersion = p.previousVersion
      // Copy over any relationships to Issue
      WITH p, m
      OPTIONAL MATCH (i:Issue)-[r:HAS_PLAN]->(p)
      MERGE (i)-[:HAS_PLAN]->(m)
      DELETE r
      // Remove Plan node and its relationships
      DETACH DELETE p
    `
    const result = await session.run(cypher)
    console.log("Migration complete. Summary:", result.summary)
  } catch (e) {
    console.error("Migration failed:", e)
  } finally {
    await session.close()
    await client.close()
  }
}

runMigration()
