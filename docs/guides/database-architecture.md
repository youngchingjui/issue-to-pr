# Workflow Database Architecture

## Overview

This document outlines the architecture for storing and managing workflow actions in our system. The architecture is designed to support complex, branching workflows with multiple agents, user interactions, and cross-branch awareness.

## System Requirements

### Core Requirements

1. Store workflow actions/events/messages in a persistent database
2. Support hierarchical relationships between nodes
3. Enable cross-branch monitoring and awareness
4. Track decision points and chosen options
5. Maintain clear path to root node (system prompt)
6. Support both LLM and user interactions
7. Real-time updates and streaming

### Performance Requirements

1. Fast traversal of node relationships
2. Efficient querying of workflow history
3. Real-time event propagation
4. Support for concurrent workflows
5. Scalable to handle large workflows

## Database Selection: Neo4j

After evaluating different database options, we've chosen Neo4j as our primary storage solution for workflow data.

### Why Neo4j?

1. **Native Graph Structure**

   - Perfect for parent-child relationships
   - Efficient traversal queries
   - Natural representation of workflow branches
   - Built-in support for relationship types

2. **Query Performance**

   ```cypher
   // Example: Find all paths to root
   MATCH path = (n:Node {id: $nodeId})-[:PARENT_OF*]->(root:Node)
   WHERE NOT (root)-[:PARENT_OF]->()
   RETURN path
   ```

3. **Cross-Branch Monitoring**

   ```cypher
   // Example: Find nodes monitoring other branches
   MATCH (monitor:Node)-[:MONITORS]->(target:Node)
   WHERE monitor.branch_id <> target.branch_id
   RETURN monitor, target
   ```

4. **Built-in Visualization**
   - Helpful for debugging and monitoring
   - Clear representation of workflow state
   - Easy to understand branch relationships

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

## Implementation Stages

### Stage 1: Basic Event Storage

- Setup Neo4j database
- Implement basic node creation
- Maintain parent-child relationships
- Basic event querying

### Stage 2: Decision Points

- Add support for decision nodes
- Implement option tracking
- Store chosen paths
- Basic branching support

### Stage 3: Cross-Branch Awareness

- Implement monitoring relationships
- Add branch summarization
- Support cross-branch decisions
- Branch visualization

### Stage 4: Advanced Features

- Real-time updates via Redis + Neo4j
- Workflow replay capability
- Analytics and metrics
- Advanced visualization

### Stage 5: Integration

- Full system integration
- Performance optimization
- Search and filtering
- Advanced UI features

## Integration with Existing System

### Event Flow

1. Event generated in workflow
2. Stored in Redis for real-time updates
3. Persisted to Neo4j for long-term storage
4. UI updated via existing SSE mechanism

### Code Example

```typescript
interface WorkflowEvent {
  id: string
  workflowId: string
  type: string
  content: string
  metadata?: Record<string, any>
  parentId?: string
}

class WorkflowEventEmitter {
  async emit(event: WorkflowEvent) {
    // Store in Neo4j
    await neo4j.run(
      `
      MATCH (parent:Node {id: $parentId})
      CREATE (n:Node {
        id: $id,
        workflow_id: $workflowId,
        type: $type,
        content: $content,
        metadata: $metadata,
        timestamp: datetime()
      })
      CREATE (parent)-[:PARENT_OF]->(n)
    `,
      event
    )

    // Emit through Redis for real-time updates
    await redis.publish(`workflow:${event.workflowId}`, JSON.stringify(event))
  }
}
```

## Queries and Operations

### Common Queries

1. **Get Full Workflow Path**

```cypher
MATCH path = (start:Node {id: $nodeId})-[:PARENT_OF*]->(root:Node)
WHERE NOT (root)-[:PARENT_OF]->()
RETURN path
```

2. **Find Decision Points**

```cypher
MATCH (n:Node {workflow_id: $workflowId, type: 'decision'})
OPTIONAL MATCH (n)-[:OPTION_OF]->(option)
OPTIONAL MATCH (n)-[:CHOSEN_OPTION]->(chosen)
RETURN n, collect(option) as options, chosen
```

3. **Get Branch Summary**

```cypher
MATCH (n:Node {branch_id: $branchId})
WITH n
ORDER BY n.timestamp
RETURN collect(n.content) as branch_content
```

## Security Considerations

1. **Access Control**

   - Node-level permissions
   - Branch-level visibility
   - User role restrictions

2. **Data Retention**

   - Workflow history cleanup
   - Branch pruning
   - Archival strategy

3. **Audit Trail**
   - Track all modifications
   - User action logging
   - System event recording

## Next Steps

1. Set up Neo4j development environment
2. Create initial schema and indexes
3. Implement basic node creation and relationships
4. Integrate with existing Redis system
5. Add basic UI for workflow visualization

## Questions to Address

1. How long should we retain workflow history?
2. Should we implement soft deletes?
3. How to handle failed workflows?
4. What indexes will be needed for performance?
5. How to handle schema migrations in production?

## Related Documentation

- [Redis Setup](../setup/redis-setup.md)
- [Streaming Architecture](streaming-architecture.md)
- [API Endpoints](../api/database.md)
- [Development Plan](development-plan.md)

For implementation details:

- [Schema Migrations](../setup/migrations.md)
- [Data Models](../api/models.md)
- [Query Optimization](../api/queries.md)
