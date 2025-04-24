import { migrateWorkflowToWorkflowRun } from "@/lib/migrations/001_workflow_to_workflowrun"

async function main() {
  try {
    console.log("Starting migration: Workflow to WorkflowRun")
    await migrateWorkflowToWorkflowRun()
    console.log("Migration completed successfully")
  } catch (error) {
    console.error("Migration failed:", error)
    process.exit(1)
  }
}

main()
