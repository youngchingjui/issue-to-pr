# Database Migration Scripts

This directory contains database migration scripts and utilities for managing Neo4j database changes.

## Workflow to WorkflowRun Migration

This migration converts the old Workflow nodes to the new WorkflowRun model and updates Event nodes to also be Message nodes.

### Data Model Changes

Old Workflow Model:

```typescript
{
  id: string
  created_at: Date
  metadata: {
    workflowType: string
    issue: {
      number: number
      repo: string
      owner: string
    }
    postToGithub: boolean
  }
}
```

New WorkflowRun Model:

```typescript
{
  id: string
  workflowType: "commentOnIssue" | "resolveIssue" | "identifyPRGoal" | "reviewPullRequest"
  createdAt: Date
  status: "running" | "completed" | "error"
  result?: string
}
```

Key Changes:

- Flattened metadata into direct properties
- Moved issue reference to a proper `HAS_RUNS` relationship
- Standardized status values
- Added optional result field
- Renamed `created_at` to `createdAt` for consistency
- Added Message label to Event nodes
- Added `PART_OF` relationship between Message and WorkflowRun nodes

### Taking a Backup

Before running the migration, take a snapshot of your Neo4j database:

```bash
# Stop the Neo4j container (if running)
docker compose stop neo4j

# Create a backup directory
mkdir -p backups/$(date +%Y%m%d_%H%M%S)

# Copy Neo4j data volume to backup
docker run --rm \
  --volumes-from issue-to-pr-neo4j-1 \
  -v $(pwd)/backups/$(date +%Y%m%d_%H%M%S):/backup \
  alpine \
  tar czf /backup/neo4j_data.tar.gz /data

# Restart Neo4j
docker compose start neo4j
```

### Running the Step-by-Step Migration

The migration is broken down into several steps that can be run independently.
Review `scripts/migrations/workflow-to-workflowrun.cypher` to see those steps.

Or, you can run these steps using the Cypher script:

```bash
# Using cypher-shell
cat scripts/migrations/workflow-to-workflowrun.cypher | cypher-shell -u neo4j -p password

# Or using the Neo4j Browser
# Copy and paste each step separately and verify before proceeding to the next step
```

The migration script is idempotent and can be run multiple times safely.

### Restoring from Backup

If you need to restore the database to its pre-migration state:

```bash
# Stop the Neo4j container
docker compose stop neo4j

# Choose the backup to restore (replace YYYYMMDD_HHMMSS with actual timestamp)
BACKUP_DIR=backups/YYYYMMDD_HHMMSS

# Restore data from backup
docker run --rm \
  --volumes-from issue-to-pr-neo4j-1 \
  -v $(pwd)/$BACKUP_DIR:/backup \
  alpine \
  sh -c "cd / && tar xzf /backup/neo4j_data.tar.gz"

# Restart Neo4j
docker compose start neo4j
```

### Notes

- Backups are stored in `backups/` directory with timestamp-based naming
- Each backup is a compressed tar file containing the entire Neo4j data directory
- Make sure you have enough disk space for the backup
- The restore process will completely replace the current database with the backup version
- The migration script includes validation to ensure data integrity
- Any Workflow nodes with invalid or missing metadata will be preserved and reported
- The Event nodes retain their original label while also having the Message label
- New PART_OF relationships are created alongside existing BELONGS_TO_WORKFLOW relationships

---

## Repository Nodes Migration (2025-12)

For migrating existing Issues and WorkflowRuns to the new Repository node structure, see:

- scripts/migration/2025-12-repository-nodes-migration.md

This runbook covers:
- Creating/normalizing Repository nodes
- Linking Issue and WorkflowRun nodes to Repository nodes
- Creating indexes for performance
- Pre/post-verification queries
- Rollback steps and multi-environment checklist

