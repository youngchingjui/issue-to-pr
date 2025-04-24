// Rollback script to revert WorkflowRun nodes back to Workflow nodes
// Step 1: Create Workflow nodes from WorkflowRun nodes
MATCH (run:WorkflowRun)
MATCH (i:Issue)-[:HAS_RUNS]->(run)
WITH run, i
CREATE (w:Workflow {
    id: run.id,
    created_at: run.startedAt,
    metadata: apoc.convert.toJson({
        workflowType: run.workflowType,
        issue: {
            number: i.number,
            repo: split(i.repoFullName, '/')[1],
            owner: split(i.repoFullName, '/')[0]
        },
        postToGithub: false
    })
})
WITH run, w
// Step 2: Copy over Event relationships
MATCH (e:Event)-[r:BELONGS_TO_WORKFLOW]->(run)
MERGE (e)-[:BELONGS_TO_WORKFLOW]->(w)
WITH run
// Step 3: Delete WorkflowRun nodes
DETACH DELETE run;

// Step 4: Remove indexes
DROP INDEX workflow_run_id IF EXISTS;
DROP INDEX workflow_run_type IF EXISTS;
DROP INDEX workflow_run_status IF EXISTS; 