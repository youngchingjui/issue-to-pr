# 2025-12: Repository Nodes Migration

This runbook migrates historical WorkflowRun and Issue data to the new Repository node structure in Neo4j.

- Status: Ready to run
- Environments: Dev (MacBook Air), Staging (Mac Mini), Production
- Dependencies:
  - PR #1: StorageAdapter/Repository node structure in place
  - PR #2: Writers updated to create Repository/User nodes going forward
  - This is Step 3 of PR #1443 breakdown

The migration is additive and can be executed while the application is running. We still recommend running during a low-traffic window.

---

## Goals

1. Create Repository nodes for all unique repositories referenced in existing Issues
2. Link existing WorkflowRun nodes to Repository nodes
3. Link existing Issue nodes to Repository nodes
4. Create proper indexes for query performance
5. Verify data integrity after migration
6. Document rollback procedure

---

## Pre‑Migration (CRITICAL)

Always back up the database before any migration.

### 1) Backup Neo4j database

```bash
# Stop Neo4j if running
neo4j stop

# Create dump file with timestamp
neo4j-admin database dump neo4j --to-path=/path/to/backup/neo4j-backup-$(date +%Y%m%d-%H%M%S)

# Restart Neo4j
neo4j start
```

### 2) Pre‑Migration Verification Queries

Run and record results to establish a baseline.

```cypher
// Count all node types
MATCH (n)
RETURN labels(n) as nodeType, count(n) as count
ORDER BY count DESC
```

```cypher
// Check Issues with repository information
MATCH (i:Issue)
RETURN
  count(i) as totalIssues,
  count(i.repoFullName) as issuesWithRepoFullName,
  collect(DISTINCT i.repoFullName)[..10] as sampleRepoNames
```

```cypher
// Check WorkflowRuns linked to Issues
MATCH (w:WorkflowRun)
OPTIONAL MATCH (w)-[:BASED_ON_ISSUE]->(i:Issue)
RETURN
  count(w) as totalWorkflowRuns,
  count(i) as workflowRunsWithIssues
```

---

## Execute Migration

Follow these steps in order. For large datasets (> 10k nodes), consider running during low traffic, and monitor memory usage. All steps are idempotent and safe to re-run.

### Step 1: Normalize existing Repository nodes

```cypher
MATCH (r:Repository)
WHERE r.owner IS NULL OR r.name IS NULL
SET r.owner = split(r.fullName, '/')[0],
    r.name = split(r.fullName, '/')[1],
    r.createdAt = coalesce(r.createdAt, datetime())
RETURN count(r) as updatedRepositories
```

### Step 2: Create Repository nodes from Issues

```cypher
MATCH (i:Issue)
WHERE i.repoFullName IS NOT NULL
WITH DISTINCT i.repoFullName AS fullName
MERGE (r:Repository {fullName: fullName})
ON CREATE SET
  r.owner = split(fullName, '/')[0],
  r.name = split(fullName, '/')[1],
  r.createdAt = datetime()
ON MATCH SET
  r.owner = coalesce(r.owner, split(fullName, '/')[0]),
  r.name = coalesce(r.name, split(fullName, '/')[1])
RETURN count(r) as repositoriesCreated
```

### Step 3: Link WorkflowRuns to Repositories

```cypher
MATCH (w:WorkflowRun)-[:BASED_ON_ISSUE]->(i:Issue)
WHERE i.repoFullName IS NOT NULL
MATCH (r:Repository {fullName: i.repoFullName})
MERGE (w)-[:TARGETS]->(r)
RETURN count(w) as workflowRunsLinked
```

### Step 4: Link Issues to Repositories

```cypher
MATCH (i:Issue)
WHERE i.repoFullName IS NOT NULL
MATCH (r:Repository {fullName: i.repoFullName})
MERGE (i)-[:BELONGS_TO]->(r)
RETURN count(i) as issuesLinked
```

### Step 5: Create indexes (after relationships are in place)

```cypher
CREATE INDEX repository_full_name IF NOT EXISTS 
FOR (r:Repository) ON (r.fullName);

CREATE INDEX repository_owner IF NOT EXISTS 
FOR (r:Repository) ON (r.owner);

CREATE INDEX workflow_run_created_at IF NOT EXISTS 
FOR (w:WorkflowRun) ON (w.createdAt);
```

---

## Post‑Migration Verification

Run these queries to verify success. Record results for each environment and attach to the change log.

```cypher
// Verify all WorkflowRuns have Repository relationships
MATCH (w:WorkflowRun)
OPTIONAL MATCH (w)-[:TARGETS]->(r:Repository)
RETURN 
  count(w) as totalWorkflowRuns,
  count(r) as workflowRunsWithRepository,
  count(w) - count(r) as orphanedWorkflowRuns
// Expect orphanedWorkflowRuns = 0 for runs that are issue-based
```

```cypher
// Verify all Issues have Repository relationships
MATCH (i:Issue)
WHERE i.repoFullName IS NOT NULL
OPTIONAL MATCH (i)-[:BELONGS_TO]->(r:Repository)
RETURN
  count(i) as totalIssuesWithRepo,
  count(r) as issuesLinkedToRepo,
  count(i) - count(r) as orphanedIssues
// Expect orphanedIssues = 0
```

```cypher
// Check Repository nodes created
MATCH (r:Repository)
RETURN count(r) as totalRepositories
```

```cypher
// Sample Repository with relationships
MATCH (r:Repository)
OPTIONAL MATCH (r)<-[:TARGETS]-(w:WorkflowRun)
OPTIONAL MATCH (r)<-[:BELONGS_TO]-(i:Issue)
RETURN r.fullName, count(DISTINCT w) as workflowRunCount, count(DISTINCT i) as issueCount
ORDER BY workflowRunCount DESC
LIMIT 10
```

### Performance validation

```cypher
// Should be fast with new indexes
MATCH (r:Repository {fullName: 'owner/repo'})<-[:TARGETS]-(w:WorkflowRun)
RETURN w
ORDER BY w.createdAt DESC
LIMIT 20
// Target: < 1s for typical datasets
```

---

## Multi‑Environment Execution Checklist

Complete each environment fully before moving to the next.

### MacBook Air (Development)
- [ ] Backup completed
- [ ] Pre‑migration verification run
- [ ] Migration executed
- [ ] Post‑migration verification passed
- [ ] Test application with new data

### Mac Mini (Staging/Testing)
- [ ] Backup completed
- [ ] Pre‑migration verification run
- [ ] Migration executed
- [ ] Post‑migration verification passed
- [ ] Test application with new data

### Production Server
- [ ] Backup completed
- [ ] Pre‑migration verification run
- [ ] Schedule maintenance window
- [ ] Migration executed
- [ ] Post‑migration verification passed
- [ ] Monitor application for 24 hours
- [ ] Check logs for errors

---

## Rollback Procedure

If the migration fails or causes issues, immediately restore from backup.

```bash
# Stop Neo4j
neo4j stop

# Restore from backup
neo4j-admin database load neo4j --from-path=/path/to/backup/neo4j-backup-TIMESTAMP

# Restart Neo4j
neo4j start
```

After rollback, investigate and re-run the migration after remediation.

---

## Notes and Caveats

- Data Volume: For large datasets, consider batching and monitor memory usage.
- Downtime: Migration is additive; app can remain online. Prefer low-traffic windows.
- Orphaned WorkflowRuns: Some workflow runs may not be linked to Issues (e.g., PR-centric). Those will not receive TARGETS relationships in this migration and will be addressed in UI changes (PR #4).
- Index Warming: First queries after index creation may be slow while indexes warm up.

---

## References

- Tech specs: docs/internal/workflow-runs-tech-specs.md
- Prior migrations: scripts/migrations/
- Related PRs: PR #1, PR #2, PR #4, PR #1443

