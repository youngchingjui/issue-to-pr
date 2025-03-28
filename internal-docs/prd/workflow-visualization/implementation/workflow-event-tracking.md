# Workflow Event Tracking Implementation Plan

## Overview

This document outlines the implementation plan for tracking workflow events, with a clear separation between persistent storage and real-time streaming concerns. The implementation will be phased, focusing first on robust persistence of workflow events, followed by streaming capabilities in later phases.

## Stage 1: Core Persistence Layer

### Step 1: Neo4j Schema Setup

```typescript
// lib/services/WorkflowPersistenceService.ts

interface WorkflowEvent {
  id: string
  type:
    | "workflow_start"
    | "llm_complete"
    | "tool_call"
    | "tool_response"
    | "error"
    | "complete"
  workflowId: string
  data: any
  timestamp: Date
  metadata?: Record<string, any>
}

// Neo4j Schema:
// - Event nodes with properties matching WorkflowEvent interface
// - Relationships: NEXT_EVENT, BELONGS_TO_WORKFLOW, TRIGGERED_BY
```

### Step 2: Create WorkflowPersistenceService

```typescript
// lib/services/WorkflowPersistenceService.ts

export class WorkflowPersistenceService {
  private neo4j: Neo4jClient

  constructor() {
    this.neo4j = Neo4jClient.getInstance()
  }

  async saveEvent(event: WorkflowEvent) {
    const session = await this.neo4j.getSession()
    try {
      // Save complete, meaningful events only
      await this.persistEventToNeo4j(event)
    } finally {
      await session.close()
    }
  }

  async getWorkflowEvents(workflowId: string): Promise<WorkflowEvent[]> {
    // Retrieve complete workflow history
  }

  async getWorkflowState(workflowId: string): Promise<WorkflowState> {
    // Get current workflow state
  }
}
```

## Stage 2: Agent Integration

### Step 1: Update Agent Class

```typescript
// lib/agents/base/index.ts

export class Agent {
  private persistenceService: WorkflowPersistenceService

  constructor() {
    this.persistenceService = new WorkflowPersistenceService()
  }

  async runWithFunctions() {
    // Track complete messages
    await this.persistenceService.saveEvent({
      type: "llm_complete",
      workflowId: this.jobId,
      data: { content: fullContent },
      timestamp: new Date(),
    })
  }
}
```

### Step 2: Update Workflows

```typescript
// lib/workflows/commentOnIssue.ts

export default async function commentOnIssue(params) {
  const persistenceService = new WorkflowPersistenceService()

  // Track complete workflow events
  await persistenceService.saveEvent({
    type: "workflow_start",
    workflowId: jobId,
    data: { params },
    timestamp: new Date(),
  })

  try {
    // ... workflow execution ...

    // Track significant state changes
    await persistenceService.saveEvent({
      type: "status_change",
      workflowId: jobId,
      data: { status: "completed" },
      timestamp: new Date(),
    })
  } catch (error) {
    await persistenceService.saveEvent({
      type: "error",
      workflowId: jobId,
      data: { error },
      timestamp: new Date(),
    })
  }
}
```

## Stage 3: Testing & Monitoring

### Step 1: Unit Tests

Create test suite for persistence service:

- `__tests__/services/persistence.test.ts`

Test cases:

1. PersistenceService
   - Event storage
   - Workflow history
   - Relationship management
   - Error handling
   - State transitions

### Step 2: Integration Tests

Test the persistence layer:

1. Complete workflow tracking
2. Error scenarios
3. Data integrity
4. Query performance
5. Relationship accuracy

## Stage 4: Monitoring & Maintenance

### Step 1: Add Monitoring

PersistenceService metrics:

- Event storage latency
- Query performance
- Storage growth
- Relationship depth
- Error rates

### Step 2: Maintenance Tasks

PersistenceService:

- Data archival
- Index optimization
- Query performance tuning
- Backup procedures

## Stage 5: Streaming Implementation (Future Phase)

### Step 1: Create StreamingService

```typescript
// lib/services/StreamingService.ts

export class StreamingService {
  private emitter = new EventEmitter()
  private workflowStates = new Map<string, WorkflowState>()
  private readonly WORKFLOW_TIMEOUT = 1000 * 60 * 30 // 30 minutes

  constructor() {
    this.startCleanupInterval()
  }

  async emit(workflowId: string, token: StreamToken) {
    this.initWorkflow(workflowId)
    this.updateWorkflowActivity(workflowId)
    this.emitter.emit(workflowId, token)
  }

  subscribe(workflowId: string, callback: (token: StreamToken) => void) {
    this.initWorkflow(workflowId)
    this.emitter.on(workflowId, callback)
  }

  // ... cleanup and workflow state management
}

interface StreamToken {
  type: "token" | "chunk"
  content: string
  timestamp: Date
}
```

### Step 2: Streaming Integration

Update Agent and workflows to support streaming:

1. Add streaming capability to Agent class
2. Implement real-time UI updates
3. Add WebSocket support
4. Implement caching layer if needed

### Step 3: Streaming Tests

Create streaming test suite:

- `__tests__/services/streaming.test.ts`

Test cases:

1. StreamingService
   - Token emission
   - Subscription management
   - Cleanup behavior
   - Performance under load

### Step 4: Streaming Monitoring

StreamingService metrics:

- Token emission rate
- Active subscribers
- Memory usage
- Cleanup effectiveness
- WebSocket performance

## Success Criteria

1. Complete event persistence
2. Accurate workflow history
3. Efficient querying
4. Proper error handling
5. Clean data relationships
6. (Future) Real-time updates
7. (Future) Streaming performance

## Next Steps

1. Implement persistence layer
2. Set up monitoring
3. Create test infrastructure
4. (Future) Add streaming capability
5. (Future) Implement UI components
6. (Future) Add real-time visualization
