import { readFileSync } from "fs"
import { Session } from "neo4j-driver"
import { resolve } from "path"

import { Neo4jClient } from "../../lib/neo4j/client"

async function validateMigration(session: Session) {
  // Check for WorkflowRun nodes without Issue relationships
  const orphanedRuns = await session.run(`
    MATCH (run:WorkflowRun)
    WHERE NOT EXISTS((run)<-[:HAS_RUNS]-(:Issue))
    RETURN count(run) as count
  `)
  const orphanedCount = orphanedRuns.records[0].get("count").toNumber()
  if (orphanedCount > 0) {
    throw new Error(
      `Found ${orphanedCount} WorkflowRun nodes without Issue relationships`
    )
  }

  // Check for WorkflowRun nodes without Event relationships
  const noEventRuns = await session.run(`
    MATCH (run:WorkflowRun)
    WHERE NOT EXISTS((run)<-[:BELONGS_TO_WORKFLOW]-(:Event))
    RETURN count(run) as count
  `)
  const noEventCount = noEventRuns.records[0].get("count").toNumber()
  if (noEventCount > 0) {
    throw new Error(
      `Found ${noEventCount} WorkflowRun nodes without Event relationships`
    )
  }

  // Verify all Workflow nodes were properly migrated
  const workflowsWithoutRuns = await session.run(`
    MATCH (w:Workflow)
    WHERE w.metadata IS NOT NULL
    AND NOT EXISTS((w)-[:BELONGS_TO_WORKFLOW]->(:WorkflowRun))
    RETURN count(w) as count
  `)
  const unmigrated = workflowsWithoutRuns.records[0].get("count").toNumber()
  if (unmigrated > 0) {
    throw new Error(
      `Found ${unmigrated} Workflow nodes that were not properly migrated`
    )
  }
}

async function migrateWorkflowsToWorkflowRuns() {
  const client = Neo4jClient.getInstance()
  const session = await client.getSession()

  try {
    console.log("Starting migration of Workflow nodes to WorkflowRun nodes...")

    // First, count the workflows to migrate
    const countResult = await session.run(
      "MATCH (w:Workflow) WHERE w.metadata IS NOT NULL RETURN count(w) as count"
    )
    const workflowCount = countResult.records[0].get("count").toNumber()
    console.log(`Found ${workflowCount} Workflow nodes to migrate`)

    if (workflowCount === 0) {
      console.log(
        "No Workflow nodes to migrate. Checking for existing WorkflowRun nodes..."
      )
      const existingRuns = await session.run(
        "MATCH (w:WorkflowRun) RETURN count(w) as count"
      )
      const runCount = existingRuns.records[0].get("count").toNumber()
      if (runCount > 0) {
        console.log(
          `Found ${runCount} existing WorkflowRun nodes. Migration was likely already completed.`
        )
        // Still run validation to ensure data integrity
        await validateMigration(session)
        return
      }
    }

    // Read and execute migration script
    const migrationScript = readFileSync(
      resolve(__dirname, "workflow-to-workflowrun.cypher"),
      "utf-8"
    )

    // Execute migration
    console.log("Executing migration...")
    await session.run(migrationScript)

    // Validate migration
    console.log("Validating migration...")
    await validateMigration(session)

    // Get final counts
    const finalResult = await session.run(`
      MATCH (w:WorkflowRun)
      RETURN count(w) as workflowRunCount
    `)
    const workflowRunCount = finalResult.records[0]
      .get("workflowRunCount")
      .toNumber()

    console.log(`Migration completed successfully!`)
    console.log(`Created/Updated ${workflowRunCount} WorkflowRun nodes`)

    // Check for any remaining Workflow nodes
    const remainingWorkflows = await session.run(
      "MATCH (w:Workflow) RETURN count(w) as count"
    )
    const remainingCount = remainingWorkflows.records[0].get("count").toNumber()

    if (remainingCount > 0) {
      console.warn(
        `Warning: ${remainingCount} Workflow nodes still exist. These nodes likely have invalid or missing metadata.`
      )
    } else {
      console.log("All valid Workflow nodes successfully migrated")
    }
  } catch (error) {
    console.error("Migration failed:", error)
    throw error
  } finally {
    await session.close()
    await client.close()
  }
}

// Execute migration
migrateWorkflowsToWorkflowRuns()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error)
    process.exit(1)
  })
