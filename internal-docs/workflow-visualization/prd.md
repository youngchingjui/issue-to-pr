# Workflow Visualization PRD

## Problem Statement

### Context

- Current workflow execution data is difficult to understand and debug
- Users need a clear visual representation of workflow execution
- Complex relationships between workflow events are hard to trace
- No easy way to explore the full context of workflow execution

### Impact

- Developers spend excessive time debugging workflow issues
- Understanding workflow execution requires manual log parsing
- Difficult to identify patterns and optimize workflow performance
- Limited ability to share and collaborate on workflow debugging

## User Stories

### Core Visualization

```
As a developer
I want to see a graph-based visualization of workflow execution
So that I can understand the flow and relationships between events
```

### Node Exploration

```
As a developer
I want to explore different types of workflow nodes
So that I can understand the specific role and impact of each event
```

### Relationship Analysis

```
As a developer
I want to see relationships between workflow events
So that I can understand causal and sequential connections
```

### Content Preview

```
As a developer
I want to preview and expand node content
So that I can access detailed information when needed
```

## Technical Requirements

### Functional Requirements

#### Node Types Display

- status
  - Compact, non-interactive display
  - Timestamps in left column
  - Right-aligned timestamps
  - Timestamps only shown when different from previous event
  - Consistent checkmark icon
  - Muted text styling
  - Reduced vertical spacing between consecutive status events
  - Grid layout with fixed timestamp column
  - No millisecond precision in timestamps
  - Local time display
  - Grouped consecutive status updates
- workflow_start
  - Notification-style event
  - No interactive card display
  - Simple status message format
  - No interactive elements
  - Light styling to indicate workflow initiation
- system_prompt
  - Prominent display
  - Full system prompt text
  - Collapsible content
  - Clear visual distinction as context
- user_message
  - Prominent display
  - Full user message text
  - Collapsible content
  - Clear visual distinction as input
- llm_response
  - Prominent display
  - Full LLM response text
  - Collapsible content
  - Preview with full content expansion
  - Proper content truncation
- tool_call
  - Tool name display
  - Formatted parameter preview in card
  - Collapsible parameter details
  - Execution status
  - Clear parameter hierarchy
  - Complete tool response data included
- tool_response
  - Complete response data
  - Result preview
  - Response type indication
  - Error handling
  - Proper content boundaries
- error
  - High visibility styling
  - Error details
  - Recovery options
  - Clear error context
- complete
  - Notification-style event
  - No interactive card display
  - Simple success status
  - Light styling for completion state
  - No content from LLM response

#### Event Type Classification

- Status Events (Notification Style)

  - workflow_start
  - complete
  - Simple, non-interactive display
  - Clear visual distinction from interactive events
  - Minimal styling
  - Focus on status communication

- Interactive Events
  - system_prompt
  - user_message
  - llm_response
  - tool_call (with complete response data)
  - tool_response (with complete data)
  - error
  - Rich content display
  - Expandable details
  - Clear interaction affordances
  - Proper content boundaries

#### Data Structure Requirements

- Event Hierarchy
  - Clear parent-child relationships
  - Proper event sequencing
  - Accurate timestamp tracking
  - Event type categorization
  - Complete context preservation
  - System prompts and user messages tracking
  - Full LLM response capture
  - Complete tool call data with responses

For detailed information about our Neo4j implementation, including schema design, relationships, and data modeling, please refer to our official [Neo4j Architecture Documentation](../../../docs/guides/databases/neo4j-architecture.md).

- Event Data Completeness
  - LLM Events
    - Full response text
    - System prompts used
    - User messages
    - Conversation context
    - Timestamp and sequence data
  - Tool Events
    - Complete tool call parameters
    - Full tool response data
    - Error states and messages
    - Execution context
  - Status Events
    - Minimal required data
    - Clear status indicators
    - Timestamp information
    - Workflow context

#### Relationship Visualization

- Sequential relationships (next event)
- Causal relationships (trigger connections)
- Parallel execution branches
- Visual distinction between relationship types
- Interactive relationship exploration

#### UI/UX Requirements

- Layout Structure ✓

  - Consistent vertical rhythm between events
  - Simplified event wrapper structure (avoid unnecessary div nesting)
  - Mobile-responsive layout with appropriate padding
  - Reduced maximum width for better readability

- Node Types Display

  - status ✓
    - Compact, non-interactive display
    - Timestamps shown consistently (removed conditional display)
    - Consistent checkmark icon
    - Muted text styling
    - Simplified component structure
  - workflow_start
  - system_prompt
  - user_message
  - llm_response ✓
    - Prominent display
    - Full LLM response text
    - Collapsible content
    - Timestamp in header
  - tool_call
  - tool_response
  - error
  - complete

- Node expansion/collapse functionality
- Content preview system
- Full content view
- Clear visual hierarchy
- Intuitive interaction patterns

### Non-Functional Requirements

#### Service Architecture

- Streaming Service

  - Real-time token/chunk delivery
  - WebSocket/SSE connection management
  - In-memory event buffering
  - No persistence responsibilities
  - Low latency requirements
  - Connection recovery handling
  - Event debouncing and batching
  - Distinct event types for streaming:
    - Token events (lightweight, numeric timestamps)
    - Workflow events (full event data)
    - Structured events (with metadata)

- Event Type Separation

  - Streaming events optimized for real-time delivery
  - Persistent events with strict type safety for storage
  - Clear conversion path between streaming and persistent events
  - Type guards for runtime type safety

- Persistence Service
  - Neo4j data storage
  - Complete event persistence
  - Workflow state management
  - Relationship tracking
  - Data integrity assurance
  - Query optimization
  - Archival strategies

#### Performance Requirements

- Performance optimization for large workflows
- Responsive graph layout
- Smooth animations
- Efficient content loading
- Browser compatibility
- Batch updates for large workflows
- Lazy loading for historical data
- Client-side caching strategies
- Server-side query optimization
- Event buffering and batching for real-time updates

#### Security Requirements

- Access control for workflow data
- Audit logging for interventions
- Data encryption in transit
- Authentication for WebSocket connections
- Secure handling of sensitive workflow data

#### Real-time Communication

- WebSocket connections for live updates
- Connection recovery mechanisms
- Event replay for missed updates
- Event buffering system for performance
- Real-time state synchronization

#### Data Storage and Retrieval

For detailed information about our data storage implementation, including Neo4j schema design, relationships, and query optimization, please refer to our official [Neo4j Architecture Documentation](../../../docs/guides/databases/neo4j-architecture.md).

The visualization system requires:

- Fast data retrieval for workflow visualization
- Efficient relationship traversal
- Data archival strategy
- Backup procedures

## Implementation Plan

### Implementation Strategy

#### Pragmatic, Data-Driven Approach

Our implementation strategy focuses on iterative improvements to existing components rather than building new infrastructure from scratch. This approach:

1. **Builds on Existing Code**

   - Enhances the current `WorkflowRunDetailsPage` component
   - Leverages existing Neo4j data structure and relationships
   - Uses current workflow event types and data models
   - Implements modular component architecture for maintainability
   - Keeps simple logic inline where it makes sense, avoiding premature abstraction

2. **Component Architecture**

   - Base EventCard component for consistent UI/UX
   - Event-specific components for specialized display
   - Shared utilities ONLY for truly reusable operations
   - Popover system for detailed views
   - Clear separation of concerns between components
   - Simple, single-use logic kept inline for clarity

3. **Event Type Implementation**

   - LLM Response: Focused on content readability
   - Tool Call: Clear parameter visualization
   - Tool Response: Structured data display
   - Error: High-visibility error states
   - Default: Graceful handling of unknown types

4. **Iterative Feature Development**

   - Start with modular component structure ✓
   - Add event-specific improvements gradually ✓
   - Implement real-time updates on existing UI
   - Add advanced features based on actual usage patterns

This strategy ensures we:

- Deliver value quickly
- Minimize technical debt
- Base decisions on real usage patterns
- Maintain existing functionality while adding features

### Phase 1: Core Graph Structure

- [ ] Select and integrate graph visualization library
- [ ] Implement basic node-edge structure
- [ ] Develop node positioning algorithm
- [ ] Create base node styling system

### Phase 2: Node Type Implementation

- [ ] Design and implement base node component
- [ ] Create specific node type variations
- [ ] Build preview system
- [ ] Implement expandable content system

### Phase 3: Relationships and Interactions

- [ ] Implement relationship visualization
- [ ] Add interactive features
- [ ] Create relationship type indicators
- [ ] Support parallel execution branches

### Phase 4: Performance Optimization

- [ ] Implement lazy loading
- [ ] Add virtualization for large graphs
- [ ] Optimize render performance
- [ ] Implement caching system

### Dependencies

- Graph visualization library
- React/Next.js framework
- State management system
- Backend API support

### Technical Considerations

- Graph layout algorithm selection
- Content loading strategy
- State management approach
- Performance optimization techniques

## Success Metrics

### Quantitative Metrics

- Graph render time < 1s for workflows up to 100 nodes
- Node expansion/collapse time < 200ms
- Memory usage < 100MB for large workflows
- 60fps smooth scrolling and interaction

### Qualitative Metrics

- User satisfaction with visualization clarity
- Ease of workflow debugging
- Improved understanding of workflow execution
- Reduced time spent on workflow analysis

## Timeline and Milestones

- Phase 1 Completion: [Date + 2 weeks]
- Phase 2 Completion: [Date + 4 weeks]
- Phase 3 Completion: [Date + 6 weeks]
- Phase 4 Completion: [Date + 8 weeks]

## Risks and Mitigation

| Risk                                     | Impact | Likelihood | Mitigation Strategy                       |
| ---------------------------------------- | ------ | ---------- | ----------------------------------------- |
| Performance issues with large workflows  | High   | Medium     | Implement virtualization and lazy loading |
| Complex graph layouts becoming confusing | High   | Medium     | Careful UX design and user testing        |
| Browser compatibility issues             | Medium | Low        | Cross-browser testing and polyfills       |
| Memory leaks in graph rendering          | High   | Low        | Regular performance profiling and testing |

## Open Questions

- What is the optimal graph layout algorithm for our use case?
- How should we handle extremely large workflows?
- What is the best approach for visualizing parallel branches?
- How do we optimize content loading for best performance?

## Appendix

### Technical Notes

For detailed information about our Neo4j implementation, including data models, relationships, and common queries, please refer to our official [Neo4j Architecture Documentation](../../../docs/guides/databases/neo4j-architecture.md).

For details about our Neo4j data model and relationships, please refer to our [Neo4j Architecture Documentation](../../../docs/guides/databases/neo4j-architecture.md).

Note: Events and Messages (system prompts, user messages, LLM responses, workflow run updates, etc) are linked sequentially via neo4j relationships. This better reflects the actual event and message chain structure where:

1. System prompt is the first message
2. Followed by one or more user messages
3. Then LLM responses, tool calls, and additional messages follow in sequence
4. Each message may have its own LLM model configuration
