# Neo4j Architecture

## Overview

This document details the Neo4j-specific implementation of our workflow storage system. Neo4j serves as our primary database for storing and querying workflow structures, relationships, and decision paths.

## Why Neo4j?

1. **Native Graph Structure**

   - Perfect for parent-child relationships
   - Efficient traversal queries
   - Natural representation of workflow branches
   - Built-in support for relationship types

2. **Query Performance**

   - Optimized for relationship traversal
   - Efficient path finding
   - Built-in graph algorithms

3. **Cross-Branch Monitoring**
   - Native support for complex relationships
   - Efficient branch relationship queries
   - Clear visualization capabilities

## Data Model

### Node Types

```cypher
CREATE (:WorkflowNode {
    id: string,              // UUID
    workflow_id: string,     // Reference to workflow
    type: string,            // 'action', 'decision', 'monitor'
    content: string,         // Node content/message
    metadata: map,           // Flexible metadata storage
    timestamp: datetime(),   // Creation time
    agent_id: string,        // ID of agent that created node
    user_id: string         // ID of user if user interaction
})
```

### Relationships

```cypher
// Basic relationships
(:Node)-[:PARENT_OF]->(:Node)           // Hierarchical structure
(:Node)-[:MONITORS]->(:Node)            // Cross-branch monitoring
(:Node)-[:OPTION_OF]->(:Node)           // Decision options
(:Node)-[:CHOSEN_OPTION]->(:Node)       // Selected option
```

## Common Queries

### Get Full Workflow Path

```cypher
MATCH path = (start:Node {id: $nodeId})-[:PARENT_OF*]->(root:Node)
WHERE NOT (root)-[:PARENT_OF]->()
RETURN path
```

### Find Decision Points

```cypher
MATCH (n:Node {workflow_id: $workflowId, type: 'decision'})
OPTIONAL MATCH (n)-[:OPTION_OF]->(option)
OPTIONAL MATCH (n)-[:CHOSEN_OPTION]->(chosen)
RETURN n, collect(option) as options, chosen
```

### Get Branch Summary

```cypher
MATCH (n:Node {branch_id: $branchId})
WITH n
ORDER BY n.timestamp
RETURN collect(n.content) as branch_content
```

### Cross-Branch Monitoring

```cypher
MATCH (monitor:Node)-[:MONITORS]->(target:Node)
WHERE monitor.branch_id <> target.branch_id
RETURN monitor, target
```

## Performance Considerations

1. **Indexing**

   - Create indexes on frequently queried properties
   - Use composite indexes for complex queries
   - Consider relationship indexes for heavy traversals

2. **Query Optimization**

   - Use parameterized queries
   - Leverage EXPLAIN and PROFILE for query tuning
   - Consider query caching for frequent patterns

3. **Scaling**
   - Monitor node and relationship growth
   - Implement data archival strategies
   - Consider read replicas for heavy query loads
