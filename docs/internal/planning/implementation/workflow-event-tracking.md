# Workflow Event Tracking Implementation Plan

## Overview

This document outlines the implementation plan for tracking workflow events, with a clear separation between real-time streaming and persistent storage concerns.

## Stage 1: Service Separation

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
}

interface WorkflowEvent {
  type: "llm_complete" | "tool_call" | "tool_response" | "error" | "complete"
  workflowId: string
  data: any
  timestamp: Date
  metadata?: Record<string, any>
}
```

## Stage 2: Integration with Agent

### Step 1: Update Agent Class

```typescript
// lib/agents/base/index.ts

export class Agent {
  private streamingService: StreamingService
  private persistenceService: WorkflowPersistenceService

  constructor() {
    this.streamingService = new StreamingService()
    this.persistenceService = new WorkflowPersistenceService()
  }

  async runWithFunctionsStream() {
    // Handle streaming for UI updates
    for await (const chunk of response) {
      if (chunk.choices[0]?.delta?.content) {
        this.streamingService.emit(this.jobId, {
          type: "token",
          content: chunk.choices[0].delta.content,
          timestamp: new Date(),
        })
      }
    }

    // Persist complete message
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

## Stage 3: Testing & Verification

### Step 1: Unit Tests

Create separate test suites for each service:

- `__tests__/services/streaming.test.ts`
- `__tests__/services/persistence.test.ts`

Test cases:

1. StreamingService
   - Token emission
   - Subscription management
   - Cleanup behavior
2. PersistenceService
   - Event storage
   - Workflow history
   - Relationship management

### Step 2: Integration Tests

Test the services working together:

1. Verify streaming doesn't affect persistence
2. Check persistence of complete events
3. Validate workflow visualization data
4. Test error scenarios

## Stage 4: Monitoring & Maintenance

### Step 1: Add Separate Monitoring

1. StreamingService metrics:

   - Token emission rate
   - Active subscribers
   - Memory usage
   - Cleanup effectiveness

2. PersistenceService metrics:
   - Event storage latency
   - Query performance
   - Storage growth
   - Relationship depth

### Step 2: Maintenance Tasks

1. StreamingService:

   - Memory usage optimization
   - Subscription cleanup
   - Connection management

2. PersistenceService:
   - Data archival
   - Index optimization
   - Query performance tuning

## Success Criteria

1. Clear separation of concerns
2. Real-time updates work smoothly
3. Complete events properly persisted
4. No performance degradation
5. Clean visualization data

## Next Steps

1. Implement UI components
2. Add data analysis tools
3. Create monitoring dashboards
4. Optimize performance
