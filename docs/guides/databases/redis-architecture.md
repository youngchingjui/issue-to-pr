# Redis Architecture

## Overview

Redis serves as our real-time state management and event streaming solution, complementing Neo4j's persistent storage. This document outlines how Redis is used in our system for real-time updates, token management, and workflow coordination.

## Core Functionalities

### 1. Token Management

- Storage and refresh of authentication tokens
- Session management
- Rate limiting and quota tracking

### 2. Event Streaming

- Real-time workflow updates
- SSE (Server-Sent Events) backend
- Event buffering and delivery

### 3. Job Status Tracking

- Current workflow state
- Job progress monitoring
- Error state management

### 4. Workflow Coordination

- Inter-agent communication
- Temporary state storage
- Action queue management

## Implementation Details

### Event Flow System

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
    // Emit through Redis for real-time updates
    await redis.publish(`workflow:${event.workflowId}`, JSON.stringify(event))

    // Additional processing can be added here
  }
}
```

### Key Patterns

```
# Authentication
auth:token:{userId}           // User auth tokens
auth:refresh:{userId}         // Refresh tokens
auth:rate:{userId}           // Rate limiting data

# Workflow
workflow:status:{workflowId} // Current workflow status
workflow:events:{workflowId} // Event stream
workflow:queue:{workflowId}  // Action queue

# System
system:metrics:{metricName}  // System metrics
system:health:{serviceId}    // Service health status
```

## Infrastructure Setup

### Production Environment

- Upstash Redis for managed service
- Multi-zone deployment
- Automatic failover

### Development Environment

- Local Redis instance
- Development-specific configurations
- Testing utilities

## Performance Considerations

### 1. Memory Management

- Set appropriate maxmemory limits
- Configure eviction policies
- Monitor memory usage

### 2. Persistence

- Configure RDB snapshots
- Set AOF persistence
- Backup strategies

### 3. Scaling

- Implement proper key expiration
- Use Redis Cluster for large deployments
- Monitor throughput and latency

## Integration with Neo4j

### Event Flow

1. Events are first published to Redis for real-time updates
2. Events are then persisted to Neo4j for long-term storage
3. UI receives updates via SSE backed by Redis
4. Background job synchronizes Redis and Neo4j states

### Code Example

```typescript
class WorkflowStateManager {
  async updateState(workflowId: string, state: WorkflowState) {
    // Update Redis for real-time access
    await redis.hset(`workflow:${workflowId}`, {
      state: JSON.stringify(state),
      updatedAt: Date.now(),
    })

    // Queue Neo4j update
    await this.queuePersistenceUpdate(workflowId, state)
  }

  private async queuePersistenceUpdate(
    workflowId: string,
    state: WorkflowState
  ) {
    await redis.lpush(
      "persistence:queue",
      JSON.stringify({
        workflowId,
        state,
        timestamp: Date.now(),
      })
    )
  }
}
```
