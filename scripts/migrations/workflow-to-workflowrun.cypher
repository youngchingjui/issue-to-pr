// Migration script to convert Workflow nodes to WorkflowRun nodes
// This script is idempotent and can be run multiple times safely

// Step-by-step migration script

// Step 1: Add WorkflowRun label to existing Workflow nodes (without removing Workflow label yet)
MATCH (w:Workflow)
WHERE w.metadata IS NOT NULL
SET w:WorkflowRun
REMOVE w:Workflow;

// Step 2: Add Message label to Event nodes (without removing Event label)
MATCH (e:Event)
SET e:Message;

// Step 3: Create PART_OF relationships between Messages and WorkflowRuns
MATCH (m:Message)<-[:BELONGS_TO_WORKFLOW]-(w:WorkflowRun)
MERGE (m)-[:PART_OF]->(w);
