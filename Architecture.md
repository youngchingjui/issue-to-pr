# Streaming Responses Architecture

## Overview

This document outlines the architecture for implementing real-time streaming responses from the `commentOnIssue` workflow to the front-end client.

## System Components

### 1. Backend Components

#### Event Emitter Service

- Utilizes `WorkflowEventEmitter` to emit events during the comment generation process
- Events include processing status, LLM responses, and error states
- Each event contains:
  - type: The event type (llm_response, error, complete)
  - data: The content payload
  - timestamp: When the event occurred

#### Server-Sent Events (SSE) Endpoint

- Endpoint: `/api/workflows/:workflowId/events`
- Establishes a persistent connection with the client
- Streams events in real-time using SSE protocol
- Maintains connection until workflow completion or error

### 2. Frontend Components

#### EventSource Client

- Establishes SSE connection with the backend
- Listens for incoming events
- Handles connection management and reconnection

#### Stream Handler Component

- Manages the state of incoming stream data
- Updates UI in real-time as new tokens arrive
- Handles different event types appropriately

### 3. Data Flow

1. Client initiates comment generation request
2. Server starts `commentOnIssue` workflow
3. `WorkflowEventEmitter` emits events during processing
4. SSE endpoint streams events to connected clients
5. Frontend components update UI based on received events

## Implementation Details

### Event Types

```typescript
interface WorkflowEvent {
  type: "llm_response" | "error" | "complete"
  data: {
    content: string
  }
  timestamp: Date
}
```

### Connection Management

- Frontend maintains EventSource connection
- Implements reconnection logic for dropped connections
- Handles cleanup on component unmount

### Error Handling

- Backend emits error events for failed operations
- Frontend displays appropriate error messages
- Connection retry mechanism for temporary failures

## Security Considerations

- Authenticate SSE connections
- Validate workflowId to prevent unauthorized access
- Rate limiting for connection attempts
- Timeout mechanisms for stale connections

## Performance Considerations

- Connection pooling for multiple clients
- Memory management for long-running streams
- Cleanup of completed workflow resources
