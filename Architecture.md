# Streaming Responses Architecture

## Overview

This document outlines the architecture for implementing real-time streaming responses from the `commentOnIssue` workflow to the front-end client.

## System Components

### 1. Backend Components

#### Redis Event Coordinator (Node.js Runtime)

- Uses existing Redis implementation from redis-old.ts, enhanced for streaming
- Pub/Sub based real-time event delivery
- Key structure:
  ```typescript
  // Event channels
  `workflow:${id}` - Pub/Sub channel for real-time events
  `workflow:${id}:history` - List of historical events
  `workflow:${id}:metadata` - Workflow metadata
  ```
- Methods:

  ```typescript
  // Publisher (Node.js Runtime)
  async function publishEvent(workflowId: string, event: WorkflowEvent) {
    await redis.publish(`workflow:${workflowId}`, JSON.stringify(event))
    await redis.lpush(`workflow:${workflowId}:history`, JSON.stringify(event))
  }

  // Subscriber (Edge Runtime)
  async function subscribeToEvents(workflowId: string) {
    const subscriber = redis.duplicate()
    await subscriber.subscribe(`workflow:${workflowId}`)
    return subscriber
  }
  ```

#### SSE Endpoint (Edge Runtime)

- Uses TransformStream for efficient event delivery
- Connects to Redis Pub/Sub for real-time events
- Handles both:
  1. Initial history replay from Redis lists
  2. Real-time events from Pub/Sub
- No OpenAI SDK dependency (Edge compatible)

#### commentOnIssue Workflow (Node.js Runtime)

- Handles the core business logic
- Emits events through WorkflowEventEmitter
- Manages workflow lifecycle:
  - Initialization
  - Progress updates
  - Error handling
  - Completion
- Returns structured WorkflowResult

### 2. Frontend Components

#### StreamHandler React Component ✅

- Location: `components/StreamHandler.tsx`
- Props:
  ```typescript
  interface StreamHandlerProps {
    workflowId: string
    onComplete?: (content: string) => void
    onError?: (error: Error) => void
    className?: string
  }
  ```
- Features:
  - Manages streaming state with React hooks
  - Simulates streaming with mock data (Stage 1)
  - Provides Start/Stop controls
  - Displays real-time content updates
  - Handles cleanup on unmount
  - Supports error handling and completion callbacks
- UI Components:
  - Control button with dynamic state
  - Content display area with monospace font
  - Workflow ID display
  - Clean, responsive layout with Tailwind CSS

### 3. Type Definitions

```typescript
interface WorkflowEvent {
  type: "llm_response" | "error" | "complete"
  data: {
    content: string
    [key: string]: any // Additional metadata
  }
  timestamp: Date
}

interface WorkflowOptions {
  maxRetries?: number
  timeout?: number
  onProgress?: (progress: number) => void
}

interface WorkflowResult {
  success: boolean
  content: string
  error?: Error
  metadata?: Record<string, any>
}
```

### 4. Data Flow

```mermaid
sequenceDiagram
    participant Client as React Client
    participant SSE as SSE Endpoint (Edge)
    participant Workflow as commentOnIssue Workflow
    participant Emitter as WorkflowEventEmitter

    Client->>Workflow: 1. Start comment generation
    activate Workflow
    Workflow->>Emitter: 2. Create workflow instance
    Client->>SSE: 3. Connect to SSE endpoint
    activate SSE
    SSE->>Emitter: 4. Subscribe to events

    loop Event Generation
        Workflow->>Emitter: 5. Emit event
        Emitter->>SSE: 6. Forward event
        SSE->>Client: 7. Stream to client
    end

    Workflow->>Emitter: 8. Emit completion
    Emitter->>SSE: 9. Forward completion
    SSE->>Client: 10. Stream completion
    deactivate Workflow
    SSE->>Emitter: 11. Unsubscribe
    Client->>SSE: 12. Close connection
    deactivate SSE
```

## NextJS Runtime Considerations

### Edge Runtime Components

- SSE endpoint (`app/api/workflows/[workflowId]/events/route.ts`)
  - Lightweight, stateless handling of SSE connections
  - Optimized for real-time streaming
  - Limited to Edge-compatible APIs

### Node.js Runtime Components

- WorkflowEventEmitter service
  - Full access to Node.js EventEmitter functionality
  - Maintains subscriber state
- commentOnIssue workflow
  - Complex processing capabilities
  - Access to full Node.js APIs and dependencies

## Implementation Guidelines

### 1. Error Handling

- Proper error propagation through event system
- Automatic cleanup of resources on error
- Clear error messaging to client

### 2. Memory Management

- Cleanup of completed workflow subscribers
- Proper closing of SSE connections
- Garbage collection of unused workflow instances

### 3. Security Considerations

- Authenticate SSE connections
- Validate workflowId to prevent unauthorized access
- Rate limiting for connection attempts
- Timeout mechanisms for stale connections

### 4. Performance Optimization

- Connection pooling for multiple clients
- Efficient event propagation
- Proper cleanup of completed workflow resources

## Usage Example

```typescript
// In your React component:
function CommentPage() {
  const handleComplete = (content: string) => {
    console.log('Comment generation completed:', content);
  };

  const handleError = (error: Error) => {
    console.error('Error:', error);
  };

  return (
    <StreamHandler
      workflowId="some-workflow-id"
      onComplete={handleComplete}
      onError={handleError}
      className="prose"
    />
  );
}
```

### LLM Token Streaming

#### Event Types

```typescript
interface TokenEvent extends BaseEvent {
  type: "token"
  data: {
    content: string
    isComplete: boolean
    metadata?: {
      finishReason?: string
      usage?: TokenUsage
    }
  }
}
```

#### Token Processing

- TransformStream handles token chunking and formatting
- Redis stores complete history for replay/recovery
- Edge runtime manages backpressure and client connections

## Runtime Considerations

### Edge Runtime (SSE Endpoint)

- Handles client connections via TransformStream
- Subscribes to Redis Pub/Sub for real-time updates
- Serves events to clients with minimal latency
- No heavy dependencies

### Node.js Runtime (Workflow Processing)

- Handles LLM interactions via OpenAI SDK
- Manages workflow business logic
- Publishes events through Redis Pub/Sub
- Maintains event history

### Redis (State Coordination)

- Single source of truth for events
- Coordinates between runtimes
- Handles subscriber management
- Provides event persistence

```

```

```

```
