# Data Flow Patterns

## Overview

This document describes how data flows through our multi-database system, utilizing PostgreSQL for structured data, Neo4j for workflow relationships, and Redis for real-time updates.

## Plan Workflow with Merged Nodes

Plan proposals, reviews, and all associated metadata now reside on a single node in Neo4j with multiple labels (e.g. `:Event:Plan`). There is no longer a dedicated Plan node. Instead:

- **Creation:** Plan is created by labeling the target LLM Response/Message/Event node with `:Plan` and setting plan metadata fields.
- **Query:** All queries match nodes with both labels for correct retrieval.
- **Versioning:** Plan versions are managed via properties and `:PREVIOUS_VERSION` relations.
- **Migration:** See `scripts/neo4j-plan-merge-migration.ts` for migration details from legacy model.

### Example Cypher

```cypher
// Create or promote an LLM response as a Plan
MATCH (m:Event {id: $messageId, type: "llm_response"})
SET m:Plan, m.status = "draft", m.type = "issue_resolution"
```

```cypher
// Query for latest Plan on an issue
MATCH (i:Issue {number: $issueNumber, repoFullName: $repoFullName})-[:HAS_PLAN]->(p:Event:Plan)
RETURN p
ORDER BY p.createdAt DESC
LIMIT 1
```

```cypher
// Plan versioning/lineage
MATCH (p:Event:Plan {id: $planId})
OPTIONAL MATCH (p)-[:PREVIOUS_VERSION]->(prev:Event:Plan)
RETURN p, prev
```

## Rest of Document

(Existing event, persistence, and content flows remain unchanged. Only plan/llm_response workflow merges the model; all interactions happen via shared nodes.)
