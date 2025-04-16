import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") })

import { Neo4jClient } from "../lib/neo4j/client.js"

async function migrateIssueNodes() {
  const client = Neo4jClient.getInstance()
  const session = await client.getSession()

  console.log("Starting issue node migration...")

  try {
    // Find all workflows with issue information in their metadata
    const result = await session.run(`
      MATCH (w:Workflow)
      WHERE w.metadata IS NOT NULL
      AND w.metadata CONTAINS '"number":'
      AND w.metadata CONTAINS '"repoFullName":'
      RETURN w.id as id, w.metadata as metadata
    `)

    console.log(`Found ${result.records.length} workflows with issue metadata`)

    // Process each workflow
    for (const record of result.records) {
      const workflowId = record.get("id")
      const metadata = JSON.parse(record.get("metadata"))

      console.log(`workflow id: ${workflowId}`)
      console.log("workflow metadata:", JSON.stringify(metadata, null, 2))
      // Extract issue information from metadata
      const issueNumber = metadata.number
      const repoFullName = metadata.repoFullName

      if (!issueNumber || !repoFullName) {
        console.log(
          `Skipping workflow ${workflowId} - missing issue information`
        )
        continue
      }

      console.log(
        `Processing workflow ${workflowId} for issue #${issueNumber} in ${repoFullName}`
      )

      // Create Issue node and relationship
      await session.run(
        `
        MATCH (w:Workflow {id: $workflowId})
        MERGE (i:Issue {number: $issueNumber, repoFullName: $repoFullName})
        MERGE (w)-[:BASED_ON_ISSUE]->(i)
      `,
        {
          workflowId,
          issueNumber,
          repoFullName,
        }
      )
    }

    // Verify migration
    const verificationResult = await session.run(`
      MATCH (w:Workflow)-[:BASED_ON_ISSUE]->(i:Issue)
      RETURN count(DISTINCT i) as issueCount, count(w) as workflowCount
    `)

    const issueCount = verificationResult.records[0]
      .get("issueCount")
      .toNumber()
    const workflowCount = verificationResult.records[0]
      .get("workflowCount")
      .toNumber()

    console.log("\nMigration complete!")
    console.log(`Created ${issueCount} unique Issue nodes`)
    console.log(`Connected ${workflowCount} workflows to Issue nodes`)
  } catch (error) {
    console.error("Error during migration:", error)
    throw error
  } finally {
    await session.close()
  }
}

// Run migration if this script is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  migrateIssueNodes()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Migration failed:", error)
      process.exit(1)
    })
}

export default migrateIssueNodes
