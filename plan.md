# Implementation Plan for Streaming Responses

## Overview

This plan outlines the steps needed to implement real-time streaming responses from the `commentOnIssue` workflow to the front-end client, based on the architecture defined in Architecture.md.

## Staged Implementation

### Stage 1: Basic Frontend Streaming (1-2 days) ✅

**Goal**: Create simplest possible streaming UI with mock data

**Components**:

1. Basic StreamHandler component ✅
   - Simple text display area ✅
   - Start/Stop button ✅
   - Uses mock data array that streams one item at a time ✅
   - Implemented in `components/StreamHandler.tsx`
   - Features:
     - Real-time text streaming simulation
     - Clean UI with Tailwind CSS
     - Proper cleanup on unmount
     - Error handling support
     - Completion callback
2. Demo page ✅
   - Mount StreamHandler ✅
   - Show streaming status ✅
   - Implemented in `app/demo/page.tsx`
   - Features:
     - Clean layout
     - Error and completion handlers
     - Workflow ID display

**Testing**: ✅

- Verify text appears gradually ✅
- Verify start/stop functionality ✅
- Test basic error scenarios ✅

### Stage 2: Redis Event Structure (1-2 days)

**Goal**: Set up Redis Pub/Sub and event structure

**Components**:

1. Enhanced Redis Service

   ```typescript
   interface RedisStreamService {
     // Real-time event publishing
     publishEvent(workflowId: string, event: WorkflowEvent): Promise<void>
     // Subscribe to real-time events
     subscribeToEvents(workflowId: string): Promise<RedisSubscriber>
     // Get event history
     getEventHistory(workflowId: string): Promise<WorkflowEvent[]>
   }
   ```

2. Migration from redis-old.ts

   - Preserve existing job status functionality
   - Add streaming capabilities
   - Maintain backward compatibility

3. Event Types

   ```typescript
   // Base type for all stream events
   interface BaseStreamEvent {
     type: string // Extensible event type
     data: unknown // Flexible payload type
   }

   // Lightweight event for LLM tokens
   interface TokenEvent extends BaseStreamEvent {
     type: "token"
     data: string // Just the token content
   }

   // For events requiring more structure
   interface StructuredEvent extends BaseStreamEvent {
     id?: string // Optional ID for events that need reference
     timestamp?: number // Only when timing is relevant
     metadata?: Record<string, unknown> // Optional metadata when needed
   }
   ```

**Testing**:

- Verify Pub/Sub functionality
- Test history retrieval
- Validate event format
- Measure latency

### Stage 3: SSE with TransformStream (2 days)

**Goal**: Implement SSE endpoint with proper streaming

**Components**:

1. Basic SSE Endpoint
   ```typescript
   const stream = new TransformStream({
     transform(event, controller) {
       controller.enqueue(`data: ${JSON.stringify(event)}\n\n`)
     },
   })
   ```
2. Enhanced StreamHandler
   - Connect to SSE endpoint
   - Handle connection lifecycle
   - Basic error display
3. Demo with mock events
   - Hardcoded event sequence
   - Simulated delays

**Testing**:

- Test stream formatting
- Verify connection handling
- Test error scenarios

### Stage 4: Redis Integration (2-3 days)

**Goal**: Connect Redis and SSE systems

**Components**:

1. Redis Event Polling
   ```typescript
   async function* pollEvents(workflowId: string) {
     while (true) {
       const events = await redis.lrange(`workflow:${workflowId}:events`, 0, -1)
       for (const event of events) {
         yield JSON.parse(event)
       }
       await new Promise((resolve) => setTimeout(resolve, 100))
     }
   }
   ```
2. Subscriber Management
   - Track active connections in Redis
   - Clean up disconnected clients
3. Demo with real Redis
   - Manual event publishing
   - Multiple client testing

**Testing**:

- Test polling efficiency
- Verify cleanup
- Load test with multiple clients

### Stage 5: LLM Token Streaming (2-3 days)

**Goal**: Add support for LLM token streaming

**Components**:

1. Token Event Types
   ```typescript
   interface TokenEvent extends BaseEvent {
     type: "token"
     data: {
       content: string
       isComplete: boolean
       metadata?: TokenMetadata
     }
   }
   ```
2. Token Processing
   - Implement chunking
   - Handle partial responses
3. Demo with simulated LLM
   - Mock token generation
   - Test different scenarios

**Testing**:

- Test token chunking
- Verify metadata handling
- Test completion detection

### Stage 6: Error Handling & Recovery (2 days)

**Goal**: Implement robust error handling

**Components**:

1. Error Types
   ```typescript
   interface ErrorEvent extends BaseEvent {
     type: "error"
     data: {
       message: string
       code: string
       recoverable: boolean
       retryCount?: number
     }
   }
   ```
2. Recovery Mechanisms
   - Implement reconnection logic
   - Add event replay capability
3. Error Demo Page
   - Test various failure scenarios
   - Show recovery process

**Testing**:

- Test reconnection flows
- Verify event replay
- Validate error handling

### Stage 7: Production Integration (2-3 days)

**Goal**: Connect all systems with real LLM

**Components**:

1. LLM Integration
   - Connect to OpenAI streaming
   - Handle real token streams
2. Full Workflow
   - Complete error handling
   - Production logging
3. Load Testing
   - Multiple concurrent users
   - Performance monitoring

**Testing**:

- End-to-end workflow tests
- Concurrent user testing
- Error scenario validation

### Stage 8: Optimization & Cleanup (2 days)

**Goal**: Optimize performance and resource usage

**Components**:

1. Performance Optimization
   - Redis key cleanup
   - Connection pooling
   - Event batching
2. Monitoring
   - Add metrics collection
   - Set up alerts
3. Documentation
   - Update architecture docs
   - Add monitoring guides

**Testing**:

- Performance benchmarks
- Memory usage analysis
- Load testing

### Stage 9: Long-term Storage (Optional)

**Goal**: Implement permanent storage for workflow history

**Components**:

1. Postgres Integration

   - Design workflow history schema
   - Implement data migration from Redis
   - Set up cleanup jobs

2. Storage Service

   ```typescript
   interface WorkflowStorageService {
     // Store completed workflow data
     storeWorkflow(workflowId: string): Promise<void>
     // Retrieve historical workflow data
     getWorkflow(workflowId: string): Promise<WorkflowHistory>
     // Clean up Redis after successful storage
     cleanupRedisHistory(workflowId: string): Promise<void>
   }
   ```

3. Migration Strategy
   - Keep Redis for active workflows
   - Move completed workflows to Postgres
   - Implement TTL for Redis data

**Testing**:

- Verify data persistence
- Test cleanup jobs
- Validate data integrity
- Performance testing

Note: This stage is optional and can be implemented when long-term storage becomes a requirement.

## Current Codebase Analysis

### Existing Components

1. **Backend Workflows**

   - `commentOnIssue.ts`: Main workflow for generating issue comments
   - `resolveIssue.ts`: Workflow for resolving issues
   - `identifyPRGoal.ts`: Workflow for PR goal identification
   - `reviewPullRequest.ts`: Workflow for PR reviews

2. **Frontend Components**

   - `IssueActions.tsx`: Handles issue-related actions
   - `PRActions.tsx`: Handles PR-related actions
   - `GitHubItemDetails.tsx`: Displays GitHub item details
   - `WorkflowStream.tsx`: Existing but incomplete streaming component

3. **API Routes**
   - `/api/comment/route.ts`: Handles comment generation
   - `/api/review/route.ts`: Handles PR reviews
   - `/api/workflow/[workflowId]/route.ts`: Placeholder for workflow events

## Implementation Steps

### 1. Backend Implementation

#### 1.1 Enhanced Redis Service

- Location: `lib/services/redis-stream.ts`
- Migrate from redis-old.ts
- Add Pub/Sub support
- Add event history
- Add proper cleanup

#### 1.2 Server-Sent Events (SSE) Endpoint 🔄

**File:** `app/api/workflows/[workflowId]/events/route.ts`

- [ ] Create new Edge runtime endpoint
- [ ] Implement SSE connection handling
- [ ] Add authentication middleware
- [ ] Set up proper headers
- [ ] Handle connection lifecycle

#### 1.3 Workflow Modifications

**File:** `lib/workflows/commentOnIssue.ts`

- [ ] Integrate with WorkflowEventEmitter
- [ ] Add event emission points
- [ ] Modify progress updates to use events
- [ ] Update error handling to emit events
- [ ] Implement streaming response generation

### 2. Frontend Implementation

#### 2.1 StreamHandler Component

**File:** `components/workflow-runs/StreamHandler.tsx`

- [ ] Create new StreamHandler component
- [ ] Implement EventSource connection management
- [ ] Add event type handling
- [ ] Implement UI state management
- [ ] Add error handling and completion callbacks

#### 2.2 Integration with Existing Components

**Files:**

- `components/issues/IssueActions.tsx`
- `components/contribute/GitHubItemDetails.tsx`
- [ ] Update components to use StreamHandler
- [ ] Modify workflow controllers to support streaming
- [ ] Add loading states for streaming
- [ ] Update UI to show streaming progress

### 3. Type Definitions ✅

**File:** `lib/services/EventEmitter.ts`

- [x] Create WorkflowEvent interface
- [x] Add WorkflowState interface
- [x] Define WorkflowResult type
- [x] Add streaming-related types
- [x] Add metadata support to events
- [x] Add progress tracking types
- [x] Add error handling types

### 4. Security Implementation

- [ ] Add authentication for SSE connections
- [ ] Implement rate limiting
- [ ] Add timeout mechanisms
- [ ] Set up proper CORS headers

### 5. Testing Plan

1. Unit Tests

   - [ ] WorkflowEventEmitter tests
     - [ ] Test event emission
     - [ ] Test subscription management
     - [ ] Test cleanup mechanisms
     - [ ] Test error handling
     - [ ] Test workflow state tracking
   - [ ] StreamHandler component tests
   - [ ] SSE endpoint tests

2. Integration Tests

   - [ ] End-to-end workflow tests
   - [ ] Streaming response tests
   - [ ] Error handling tests

3. Performance Tests
   - [ ] Connection pooling tests
   - [ ] Memory leak tests
   - [ ] Load testing

## Migration Strategy

1. **Phase 1: Infrastructure Setup** 🔄

   - [x] Implement WorkflowEventEmitter
   - [ ] Create SSE endpoint
   - [x] Set up type definitions

2. **Phase 2: Backend Integration**

   - [ ] Modify commentOnIssue workflow
   - [ ] Add event emission points
   - [ ] Implement error handling

3. **Phase 3: Frontend Development**

   - [ ] Create StreamHandler component
   - [ ] Update existing components
   - [ ] Add UI feedback

4. **Phase 4: Testing & Optimization**
   - [ ] Run test suite
   - [ ] Performance optimization
   - [ ] Security hardening

## Dependencies

1. Server-Sent Events (SSE) support
2. ✅ Node.js EventEmitter
3. Edge Runtime compatibility
4. React state management
5. Authentication middleware

## Timeline Estimate

1. Stage 1 (Basic Frontend Streaming): 1-2 days
2. Stage 2 (Basic Backend + Real SSE): 2-3 days
3. Stage 3 (Interactive Features): 2-3 days
4. Stage 4 (Full Integration): 3-4 days

Total Estimated Time: 8-12 days

Note: Each stage includes development, testing, and documentation time. Stages can potentially overlap as different team members can work on different components simultaneously.

## Risks and Mitigation

### Risks

1. ✅ Memory leaks from unclosed connections (Addressed with cleanup mechanisms)
2. ✅ Race conditions in event handling (Addressed with proper state management)
3. Browser compatibility issues
4. Performance degradation with many concurrent streams

### Mitigation

1. ✅ Implement proper cleanup mechanisms
2. ✅ Add connection timeouts
3. Use browser feature detection
4. Implement connection pooling
5. Add proper error boundaries
