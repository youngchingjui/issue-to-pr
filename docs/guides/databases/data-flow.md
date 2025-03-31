# Data Flow Patterns

## Overview

This document describes how data flows through our multi-database system, utilizing PostgreSQL for structured data, Neo4j for workflow relationships, and Redis for real-time updates.

## System Requirements

### Core Requirements

1. Store workflow actions/events/messages persistently
2. Support real-time updates and streaming
3. Maintain data consistency across databases
4. Enable efficient querying and retrieval
5. Support concurrent workflows
6. Ensure data durability and reliability
7. Manage draft content and user preferences
8. Support content review workflows

### Performance Requirements

1. Fast real-time event propagation
2. Efficient data synchronization
3. Minimal latency for user interactions
4. Support for high-throughput scenarios
5. Reliable event ordering

## Data Flow Architecture

Our system uses three databases, each with a specific purpose:

1. **PostgreSQL**: Structured data (user preferences, draft content)
2. **Neo4j**: Workflow relationships and connected data
3. **Redis**: Real-time state and caching

The following diagram illustrates the complete data flow through our system: [Data Flow Diagram](../../assets/data-flow-diagram.md)

## Event Flow Process

1. **Event Generation**

   - Events created by user actions or system processes
   - Events assigned unique IDs and timestamps
   - Metadata attached for tracking

2. **Real-time Processing**

   - Events immediately published to Redis
   - SSE channels updated
   - Clients receive real-time updates

3. **Persistence Flow**

   - Events queued for Neo4j storage
   - Background process handles persistence
   - Confirmation sent back to Redis

4. **State Synchronization**
   - Regular sync between Redis and Neo4j
   - Consistency checks performed
   - Error handling and recovery

## Content Generation Flow

1. **Workflow Initiation**

   - User triggers workflow
   - Event stored in Neo4j
   - Real-time updates via Redis

2. **Content Generation**

   - AI generates content
   - Content stored as draft in PostgreSQL
   - Status updated in Redis for UI

3. **Review Process**

   - User reviews draft content
   - Updates tracked in PostgreSQL
   - Status changes broadcast via Redis

4. **Publication**
   - User approves content
   - Content published to GitHub
   - Status updated across all databases

## Implementation Details

### Event Structure

```typescript
interface Event {
  id: string
  timestamp: number
  type: EventType
  payload: any
  metadata: {
    workflowId: string
    userId: string
    source: string
    version: string
  }
}
```

### Data Models

```typescript
// Existing Event interface
interface Event {
  // ... existing code ...
}

// New Draft Content interface
interface DraftContent {
  id: string
  workflowRunId: string
  contentType: "comment" | "pull_request"
  content: string
  status: "draft" | "published" | "discarded"
  metadata: {
    githubIssueId: number
    githubRepo: string
    userId: string
    timestamp: number
  }
}
```

### Data Consistency

```typescript
class DataSynchronizer {
  async syncDatabases() {
    // Get events from Redis queue
    const events = await redis.lrange("persistence:queue", 0, -1)

    // Process each event
    for (const event of events) {
      try {
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

        // Remove from Redis queue
        await redis.lrem("persistence:queue", 1, JSON.stringify(event))
      } catch (error) {
        // Handle error and retry logic
        await this.handleSyncError(event, error)
      }
    }
  }

  async syncDraftContent() {
    // Get published content from PostgreSQL
    const publishedContent = await postgres.query(
      "SELECT * FROM draft_content WHERE status = $1",
      ["published"]
    )

    // Update workflow status in Neo4j
    for (const content of publishedContent) {
      await neo4j.run(
        `
        MATCH (w:WorkflowRun {id: $workflowRunId})
        SET w.contentStatus = 'published'
        SET w.publishedAt = datetime()
        `,
        content
      )
    }
  }
}
```

## Error Handling

### Types of Errors

1. **Temporary Failures**

   - Network issues
   - Database timeouts
   - Resource constraints

2. **Data Inconsistencies**
   - Missing events
   - Duplicate events
   - Order mismatches

### Recovery Strategies

1. **Automatic Recovery**

   - Retry mechanisms
   - Event reprocessing
   - State reconstruction

2. **Manual Intervention**
   - Admin tools
   - Data repair scripts
   - Audit logging

## Monitoring and Maintenance

### Key Metrics

1. **Performance Metrics**

   - Event processing time
   - Database sync latency
   - Queue lengths
   - Error rates

2. **Health Checks**
   - Database connectivity
   - Queue health
   - System resource usage
   - Data consistency

### Maintenance Tasks

1. **Regular Tasks**

   - Queue cleanup
   - Data archival
   - Performance optimization
   - Consistency checks

2. **Emergency Procedures**
   - Error recovery
   - Data restoration
   - System rollback
