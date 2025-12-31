# Repository Nodes Migration

**Date**: 2025-12-31
**Purpose**: Add Repository nodes to Neo4j with proper relationships to WorkflowRuns and Issues
**Status**: Ready to execute

## Overview

This migration creates Repository nodes with immutable GitHub IDs and establishes direct relationships between WorkflowRuns, Issues, and Repositories. This replaces the previous approach of embedding `repoFullName` strings in Issue nodes.

## Pre-Migration Checklist

- [ ] Backup Neo4j database
- [ ] Verify current graph structure with sample queries
- [ ] Confirm no active workflow runs are in progress
- [ ] Review estimated execution time based on data volume

// TODO: Add backup instructions

// TODO: We should verify current data, graph structure, relationships, and basics to confirm that migration is correct (we didn't miss any nodes).

## Migration Steps

### Step 1: Normalize Existing Repository Nodes

Some Repository nodes may already exist from settings management. Ensure they have consistent properties.

```cypher
// Add owner and name properties to existing Repository nodes
MATCH (r:Repository)
WHERE r.owner IS NULL OR r.name IS NULL
SET r.owner = split(r.fullName, '/')[0],
    r.name = split(r.fullName, '/')[1],
    r.createdAt = coalesce(r.createdAt, datetime())
RETURN count(r) as updatedRepositories
```

**Expected result**: Count of Repository nodes that were updated with missing properties.

---

### Step 2: Create Repository Nodes from Issues

Issues contain `repoFullName` properties. Create Repository nodes for all unique repositories.

```cypher
// Create Repository nodes for all unique repositories referenced in Issues
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
RETURN count(r) as totalRepositories
```

**Expected result**: Count of total Repository nodes (created + existing).

**Note**: These Repository nodes will not have GitHub `id` or `nodeId` yet. Those will be populated on the next workflow run that references these repositories.

---

### Step 3: Link WorkflowRuns to Repositories

Create `BASED_ON_REPOSITORY` relationships between WorkflowRuns and Repositories via the Issue connection.

```cypher
// Link WorkflowRuns to Repositories via Issues
MATCH (w:WorkflowRun)-[:BASED_ON_ISSUE]->(i:Issue)
WHERE i.repoFullName IS NOT NULL
MATCH (r:Repository {fullName: i.repoFullName})
MERGE (w)-[:BASED_ON_REPOSITORY]->(r)
RETURN count(w) as linkedWorkflowRuns
```

**Expected result**: Count of WorkflowRuns now linked to Repositories.

---

### Step 4: Link Issues to Repositories

Create `IN_REPOSITORY` relationships between Issues and Repositories.

```cypher
// Link Issues to Repositories
MATCH (i:Issue)
WHERE i.repoFullName IS NOT NULL
MATCH (r:Repository {fullName: i.repoFullName})
MERGE (i)-[:IN_REPOSITORY]->(r)
RETURN count(i) as linkedIssues
```

**Expected result**: Count of Issues now linked to Repositories.

---

### Step 5: Create Indexes for Performance

Create indexes on Repository properties for fast lookups.

```cypher
// Create index on Repository.id (will be populated later)
CREATE INDEX repository_id IF NOT EXISTS FOR (r:Repository) ON (r.id)
```

```cypher
// Create index on Repository.fullName for existing queries
CREATE INDEX repository_fullname IF NOT EXISTS FOR (r:Repository) ON (r.fullName)
```

```cypher
// Create index on Repository.owner for ownership queries
CREATE INDEX repository_owner IF NOT EXISTS FOR (r:Repository) ON (r.owner)
```

**Expected result**: Indexes created successfully.

---

## Verification Queries

### Verify Repository Nodes

```cypher
// Check Repository node counts and properties
MATCH (r:Repository)
RETURN
  count(r) as totalRepos,
  count(r.id) as reposWithGithubId,
  count(r.fullName) as reposWithFullName,
  count(r.owner) as reposWithOwner
```

**Expected**: All repositories should have `fullName` and `owner`. Most will not have `id` yet.

### Verify WorkflowRun Relationships

```cypher
// Check WorkflowRun to Repository relationships
MATCH (w:WorkflowRun)-[:BASED_ON_REPOSITORY]->(r:Repository)
RETURN count(w) as workflowRunsWithRepoLink
```

**Compare with**: Total WorkflowRuns that have Issues to ensure coverage.

### Verify Issue Relationships

```cypher
// Check Issue to Repository relationships
MATCH (i:Issue)-[:IN_REPOSITORY]->(r:Repository)
RETURN count(i) as issuesWithRepoLink
```

**Compare with**: Total Issues with `repoFullName` property.

### Check for Orphaned Nodes

```cypher
// Find WorkflowRuns without Repository relationships
MATCH (w:WorkflowRun)
WHERE NOT (w)-[:BASED_ON_REPOSITORY]->(:Repository)
RETURN count(w) as orphanedWorkflowRuns, collect(w.id)[..10] as sampleIds
```

**Expected**: Should be 0 or minimal (only WorkflowRuns without associated Issues).

---

## Rollback Plan

If issues are discovered after migration:

### Remove Repository Relationships

```cypher
// Remove BASED_ON_REPOSITORY relationships
MATCH (:WorkflowRun)-[r:BASED_ON_REPOSITORY]->(:Repository)
DELETE r
RETURN count(r) as deletedWorkflowRunLinks
```

```cypher
// Remove IN_REPOSITORY relationships
MATCH (:Issue)-[r:IN_REPOSITORY]->(:Repository)
DELETE r
RETURN count(r) as deletedIssueLinks
```

### Remove Created Repository Nodes (Optional)

**Warning**: Only do this if Repository nodes were not previously used for settings.

```cypher
// DANGER: Only run if you want to remove all Repository nodes
// This will also remove settings relationships
MATCH (r:Repository)
WHERE NOT (r)-[:HAS_SETTINGS]->()
DELETE r
RETURN count(r) as deletedRepositories
```

---

## Post-Migration Steps

1. **Update Application Code**: Deploy the updated code that:
   - Uses `repository` object in `CreateWorkflowRunInput`
   - MERGEs Repository nodes with GitHub IDs on workflow run creation
   - Updates mutable properties (fullName, owner, name, etc.)

2. **Monitor First Few Workflow Runs**: Check that:
   - Repository nodes are created/updated with GitHub `id` and `nodeId`
   - Relationships are established correctly
   - Mutable properties are updated when they change

3. **Gradual Backfill of GitHub IDs**: Over time, as workflow runs execute:
   - Existing Repository nodes will gain their GitHub `id` and `nodeId`
   - All mutable properties will be refreshed with latest GitHub data

---

## Notes

- **No downtime required**: Migration can run while application is live
- **GitHub IDs populated lazily**: Will be added on next workflow run for each repository
- **Backward compatible**: Old code using `repoFullName` still works during transition
- **Settings preserved**: Existing Repository nodes with settings are updated, not replaced

---

## Success Criteria

✅ All Repository nodes have `fullName`, `owner`, and `name` properties
✅ All WorkflowRuns with Issues have `BASED_ON_REPOSITORY` relationships
✅ All Issues have `IN_REPOSITORY` relationships
✅ Indexes created successfully
✅ No orphaned WorkflowRuns or Issues
✅ Settings relationships preserved

---

## Timeline

- **Estimated execution time**: 5-15 minutes (depends on data volume)
- **Verification time**: 5-10 minutes
- **Total migration window**: ~30 minutes

---

## Contact

For questions or issues during migration, contact the engineering team.
