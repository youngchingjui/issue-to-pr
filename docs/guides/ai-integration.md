# AI Integration Guide

## Table of Contents

1. [Overview](#overview)
2. [AI Agents](#ai-agents)
3. [OpenAI Integration](#openai-integration)
4. [Streaming Architecture](#streaming-architecture)
5. [Observability](#observability)

## Overview

The application uses a multi-agent AI system to analyze and resolve GitHub issues automatically. Each agent is specialized for specific tasks in the workflow.

## AI Agents

### LibrarianAgent

- Purpose: Analyzes codebase structure
- Responsibilities:
  - Understanding file organization
  - Identifying relevant code sections
  - Mapping dependencies

### CoordinatorAgent

- Purpose: Orchestrates the resolution process
- Responsibilities:
  - Managing workflow steps
  - Delegating tasks to other agents
  - Ensuring coherent solution

### ThinkerAgent

- Purpose: Analyzes issues and proposes solutions
- Responsibilities:
  - Understanding issue context
  - Planning resolution strategy
  - Identifying required changes

### CoderAgent

- Purpose: Generates code changes
- Responsibilities:
  - Writing code modifications
  - Ensuring code quality
  - Following project patterns

### ReviewerAgent

- Purpose: Reviews pull requests
- Responsibilities:
  - Code review
  - Suggesting improvements
  - Checking for issues

## OpenAI Integration

### Configuration

```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
```

### API Key Management

- Client-side storage for user API keys
- Key validation endpoint
- Secure key transmission

### Model Usage

- Primary model: GPT-4
- Streaming responses enabled
- Function calling for structured outputs

## Streaming Architecture

### Components

- Server-Sent Events (SSE) for real-time updates
- Redis pub/sub for event distribution
- Event types:
  - LLM responses
  - Status updates
  - Error notifications

### Implementation

```typescript
// Server-side streaming
const stream = new TransformStream()
const writer = stream.writable.getWriter()
const encoder = new TextEncoder()

// Client-side consumption
const eventSource = new EventSource(`/api/sse?jobId=${jobId}`)
eventSource.onmessage = (event) => {
  // Handle streaming updates
}
```

## Observability

### Langfuse Integration

- Traces AI interactions
- Performance monitoring
- Error tracking
- Usage analytics

### Monitoring

- Response times
- Token usage
- Error rates
- Completion quality

## Related Documentation

- [API Endpoints](../api/ai.md)
- [Streaming Architecture](streaming-architecture.md)
- [Component Integration](../components/ai-components.md)
