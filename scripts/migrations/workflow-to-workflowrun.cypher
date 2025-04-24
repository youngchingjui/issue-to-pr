// Migration script to convert Workflow nodes to WorkflowRun nodes
// This script is idempotent and can be run multiple times safely

// Step 1: Add WorkflowRun label to existing Workflow nodes
MATCH (w:Workflow)
WHERE w.metadata IS NOT NULL
SET w:WorkflowRun
REMOVE w:Workflow;

// Step 2: Transform properties to match new model
MATCH (w:WorkflowRun)
WHERE w.metadata IS NOT NULL
WITH w, apoc.convert.fromJsonMap(w.metadata) as meta
SET 
    w.workflowType = meta.workflowType,
    w.status = 'completed',  // Assuming all existing workflows are completed
    w.createdAt = w.created_at
REMOVE w.metadata, w.created_at;

// Step 3: Create relationships with Issues based on metadata
MATCH (w:WorkflowRun)
WHERE w.metadata IS NOT NULL
WITH w, apoc.convert.fromJsonMap(w.metadata) as meta
MATCH (i:Issue {number: toInteger(meta.issue.number)})
WHERE i.repoFullName = meta.issue.owner + '/' + meta.issue.repo
MERGE (i)-[:HAS_RUNS]->(w);

// Step 4: Clean up any remaining metadata
MATCH (w:WorkflowRun)
WHERE w.metadata IS NOT NULL
REMOVE w.metadata;

// Step 5: Add indexes for better performance
CREATE INDEX workflow_run_id IF NOT EXISTS FOR (n:WorkflowRun) ON (n.id);
CREATE INDEX workflow_run_type IF NOT EXISTS FOR (n:WorkflowRun) ON (n.workflowType);
CREATE INDEX workflow_run_status IF NOT EXISTS FOR (n:WorkflowRun) ON (n.status); 