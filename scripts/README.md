# Database Migration Scripts

## Issue Node Migration

The `migrate-issue-nodes.ts` script migrates issue data from workflow metadata to dedicated Issue nodes in Neo4j. This is part of the implementation of issue #333, which moves GitHub issue information out of workflow metadata into proper graph relationships.

### What the Script Does

1. Finds all workflows that have issue information stored in their metadata
2. Creates Issue nodes for each unique issue found
3. Establishes `BASED_ON_ISSUE` relationships between workflows and their corresponding issues
4. Verifies the migration by counting created nodes and relationships

### Running the Migration

1. Make sure your Neo4j database is running and accessible
2. Ensure your `.env.local` file has the correct Neo4j credentials:
   ```
   NEO4J_URI="bolt://localhost:7687"
   NEO4J_USER="neo4j"
   NEO4J_PASSWORD="your-password"
   ```
3. Run the script:

   ```bash
   # Using ts-node with ESM support
   NODE_OPTIONS='--loader ts-node/esm' pnpm exec ts-node scripts/migrate-issue-nodes.ts

   # Or using the compiled JavaScript
   npm run build
   node dist/scripts/migrate-issue-nodes.js
   ```

### Verification

The script will output:

- Number of workflows processed
- Number of unique Issue nodes created
- Number of workflow-to-issue relationships established

### Rollback

If you need to rollback the migration, you can run these Cypher queries in Neo4j:

```cypher
// Remove all BASED_ON_ISSUE relationships
MATCH ()-[r:BASED_ON_ISSUE]->() DELETE r;

// Remove all Issue nodes
MATCH (i:Issue) DELETE i;
```

### Safety

- The script uses `MERGE` operations, so it's safe to run multiple times
- Existing workflow metadata is preserved
- No data is deleted during the migration
