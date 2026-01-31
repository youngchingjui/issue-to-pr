// Migration: Add INITIATED_BY relationships to existing workflow runs
//
// This migration:
// 1. Fixes existing User nodes to have id = username (for listByUser query)
// 2. Creates User nodes for repo owners found in issues
// 3. Creates INITIATED_BY relationships from workflow runs to owners
// 4. Assigns orphaned runs (no issue) to the app owner
//
// ============================================================================
// BACKUP FIRST!
// ============================================================================
// Before running this migration, create a backup:
//
//   mkdir -p backups/$(date +%Y%m%d_%H%M%S)_pre_initiated_by
//   docker run --rm \
//     --volumes-from issue-to-pr-neo4j-1 \
//     -v $(pwd)/backups/$(date +%Y%m%d_%H%M%S)_pre_initiated_by:/backup \
//     alpine \
//     tar czf /backup/neo4j_data.tar.gz /data
//
// ============================================================================
// RUN MIGRATION
// ============================================================================
// cat scripts/migrations/001-add-initiated-by-relationships.cypher | \
//   docker exec -i issue-to-pr-neo4j-1 cypher-shell -u neo4j -p <password>

// Step 1: Fix existing User nodes - set id = username where id is null
MATCH (u:User)
WHERE u.id IS NULL AND u.username IS NOT NULL
SET u.id = u.username
RETURN 'Fixed ' + count(u) + ' User nodes with missing id' as step1;

// Step 2: Create User nodes for repo owners from issues (MERGE to avoid duplicates)
MATCH (w:WorkflowRun)-[:BASED_ON_ISSUE]->(i:Issue)
WITH DISTINCT split(i.repoFullName, '/')[0] as owner
WHERE owner IS NOT NULL
MERGE (u:User {id: owner})
ON CREATE SET u.username = owner, u.createdAt = datetime()
RETURN 'Created/merged ' + count(u) + ' User nodes for repo owners' as step2;

// Step 3: Create INITIATED_BY relationships for runs with issues
MATCH (w:WorkflowRun)-[:BASED_ON_ISSUE]->(i:Issue)
WHERE NOT (w)-[:INITIATED_BY]->()
WITH w, split(i.repoFullName, '/')[0] as owner
MATCH (u:User {id: owner})
MERGE (w)-[:INITIATED_BY]->(u)
RETURN 'Created ' + count(*) + ' INITIATED_BY relationships for runs with issues' as step3;

// Step 4: Assign orphaned runs (no issue) to youngchingjui as app owner
MATCH (w:WorkflowRun)
WHERE NOT (w)-[:BASED_ON_ISSUE]->() AND NOT (w)-[:INITIATED_BY]->()
MATCH (u:User {id: 'youngchingjui'})
MERGE (w)-[:INITIATED_BY]->(u)
RETURN 'Assigned ' + count(*) + ' orphaned runs to youngchingjui' as step4;

// Verification: Count runs by owner
MATCH (w:WorkflowRun)-[:INITIATED_BY]->(u:User)
RETURN u.id as owner, count(w) as runs
ORDER BY runs DESC;
