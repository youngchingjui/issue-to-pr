# Neo4j Architecture

## Overview

This document details the Neo4j-specific implementation of our workflow storage system. Neo4j serves as our primary database for storing and querying workflow structures, relationships, and decision paths.

## Why Neo4j?

1. **Native Graph Structure**
2. **Query Performance**
3. **Cross-Branch Monitoring**

## Data Model

### 1. Core Entities (Primary Nodes)

*(...unchanged user/repo/issue/PR sections omitted)*

### 3. Execution Sequence Nodes: **Plan and LLMResponse Merge**

#### Message/LLMResponse/Plan Node (Merged)

Final plans are represented as a single node with multiple labels, e.g. `(:Event:Plan)` or `(:Message:Plan)`. The node contains both LLM response content as well as plan metadata:

```cypher
CREATE (:Event:Plan {
  id: string,
  content: string,
  model: string,
  status: string,      // draft, approved, rejected, implemented
  type: string,        // issue_resolution, etc.
  createdAt: datetime(),
  version: string,
  approvalStatus: string,
  editStatus: string,
  previousVersion: string,
  // ...other properties
  role: "assistant" | "user" | ...,
  // inherits standard event/message fields
})
```

- Plan-specific metadata is set directly on the plan node (not on a separate Plan node).
- All plan queries now target `(n:Event:Plan)` or `(n:Message:Plan)`.
- Version relationships (`:PREVIOUS_VERSION`) and issue linking are handled by relationships from the merged node.

#### Plan Versioning Example

```cypher
MATCH (current:Event:Plan {id: $planId})
OPTIONAL MATCH (current)-[:PREVIOUS_VERSION]->(prev:Event:Plan)
RETURN current, prev
```

#### Creating a Plan

```cypher
MATCH (m:Event {id: $messageId, type: "llm_response"})
SET m:Plan,
    m.status = "draft",
    m.type = "issue_resolution",
    m.createdAt = datetime(),
    m.version = "1"
MERGE (i:Issue {number: $issueNumber, repoFullName: $repoFullName})
MERGE (i)-[:HAS_PLAN]->(m)
```

#### Querying Plans by Issue

```cypher
MATCH (i:Issue {number: $issueNumber, repoFullName: $repoFullName})-[:HAS_PLAN]->(p:Event:Plan)
RETURN p
ORDER BY p.createdAt DESC
LIMIT 1
```

#### Updating Plan Status

```cypher
MATCH (p:Event:Plan {id: $planId})
SET p.status = $status
RETURN p
```

#### Migration Notes

Migration script is available in `scripts/neo4j-plan-merge-migration.ts`. See scripts for transformation logic.

### Performance, Indexing & Multi-label Querying

- Queries now use composite label `(Event:Plan)` or `(Message:Plan)` for performance.
- Avoids duplication between Plan and LLM/response nodes.

*(Other doc sections remain unchanged)*
