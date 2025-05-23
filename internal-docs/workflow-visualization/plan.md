# Workflow Visualization Planning Document

## Today's Tasks

### 1. Documentation Restructuring

#### Directory Changes ✓

Directory structure has been implemented:

```
/internal-docs
├── issue-to-pr/
│   └── user-stories.md
├── neo4j-implementation/
│   └── stages.md
├── workflow-visualization/
│   ├── prd.md
│   ├── plan.md
│   └── user-stories.md
└── templates/
    └── prd-template.md
```

### 2. Documentation Content Updates ✓

- Requirements have been consolidated and updated in PRD
- User stories have been updated with new requirements
- Technical specifications documented

### 3. Technical Requirements Documentation ✓

- Node Types Display Requirements documented
- Relationship Visualization requirements documented
- UI/UX Specifications documented

### 4. Implementation Planning

#### Immediate Tasks (This Week)

##### Sprint 1: Critical Fixes and Basic Improvements

- [x] Fix Tool Not Found Errors (Commit 1)

  - [x] Investigate tool registration system
  - [x] Add proper error handling for missing tools
  - [x] Implement graceful fallback for unknown tools
  - [x] Add error logging for debugging

- [x] Event Card Content Display (Commit 2)

  - [x] Fix content overflow in pill containers
  - [x] Implement consistent card sizing
  - [x] Add text truncation with ellipsis
  - [x] Add "Show More" functionality for long content

- [x] Status Event Simplification (Commit 3)
  - [x] Convert workflow start/complete to status indicators
  - [x] Remove card UI for status messages
  - [x] Add visual distinction for status vs. interactive events
  - [x] Ensure proper spacing between events
  - [x] Implement right-aligned timestamps on left side
  - [x] Show timestamps only when different from previous event
  - [x] Use local time without milliseconds
  - [x] Group consecutive status updates
  - [x] Add consistent checkmark icon for all status events

Each commit should be:

- Small and focused on a single improvement
- Easy to understand and verify
- Quick to revert if needed (`git revert`)
- Independently deployable without breaking existing functionality
- Tested locally before pushing to main

##### Upcoming Improvements

- [ ] Enhance Existing Workflow Visualization

  - [ ] Add visual timeline/graph view to `WorkflowRunDetails Page`
    - [ ] Start with simple top-to-bottom timeline
    - [ ] Show event relationships using arrows
    - [ ] Color-code different event types
  - [x] Improve event type displays
    - [x] Create specific card layouts for each event type
    - [ ] Add syntax highlighting for code in tool calls
    - [x] Show LLM responses in a more readable format
  - [ ] Add interactive features to existing UI
    - [ ] Implement zoom and pan for large workflows
    - [ ] Add collapsible sections for long content
    - [ ] Enable quick navigation between related events

- [ ] Real-time Updates
  - [ ] Add WebSocket connection to existing component
  - [ ] Implement live updates for active workflows
  - [ ] Show loading states for pending events

##### UI Improvements

- [x] Fix Event Card Content Display

  - [x] Prevent content overflow from pill container
  - [x] Ensure consistent card sizing
  - [x] Add proper text truncation with ellipsis

- [ ] Enhance Tool Call Event Display

  - [ ] Show parameter details in event card
  - [ ] Add proper parameter formatting
  - [ ] Implement collapsible parameter sections if needed

- [ ] Simplify Status Events
  - [ ] Convert workflow start/complete events to simple status messages
  - [ ] Remove card UI for status messages
  - [ ] Make status messages non-interactive
  - [ ] Add visual distinction for status messages vs interactive events

##### Data Structure Improvements

- [ ] Update Neo4j Data Model

  - [ ] Audit current data structure
  - [ ] Define correct relationships between events
  - [ ] Update schema to support proper event hierarchy
  - [ ] Add proper indexing for efficient queries

- [ ] Event Type Refinements
  - [ ] Properly categorize status events vs interactive events
  - [ ] Define clear event type hierarchy
  - [ ] Add proper metadata fields for each event type
  - [ ] Ensure consistent data format across event types
  - [x] Implement separate types for streaming vs persistent events
    - [x] StreamEvent type for real-time updates
    - [x] WorkflowEvent type for persistence
    - [x] Type guards for runtime safety

#### Phase 1: UI/UX Improvements (Week 1)

- [x] Event Type-Specific Enhancements

  - [x] Design and implement LLM response card
  - [x] Create tool call visualization with params
  - [x] Add error state highlighting
  - [ ] Show workflow completion summary

- [ ] Navigation and Interaction
  - [ ] Add workflow search and filtering
  - [ ] Implement event type filtering
  - [ ] Add timestamp-based navigation
  - [ ] Create workflow comparison view

#### Phase 2: Advanced Features (Week 2)

- [ ] Graph View Implementation

  - [ ] Add optional graph view toggle
  - [ ] Implement basic node layout
  - [ ] Show relationships between events
  - [ ] Enable node expansion/collapse

- [ ] Performance Optimization
  - [ ] Implement pagination for large workflows
  - [ ] Add lazy loading for event details
  - [ ] Optimize WebSocket updates
  - [ ] Cache frequently accessed data

## Questions to Resolve

1. Graph Layout

   - Which layout algorithm best suits our needs?
   - How to handle large workflows?
   - How to visualize parallel branches effectively?

2. Performance

   - What's the expected maximum number of nodes?
   - When should we load full content vs previews?
   - What's our caching strategy for node content?

3. Interaction
   - How do we best show different relationship types?
   - How should node expansion work in the graph context?
   - What navigation patterns work best for large graphs?

## Next Steps

1. [ ] Begin technical implementation planning
2. [ ] Research and select graph visualization library
3. [ ] Set up Neo4j schema and persistence layer
4. [ ] Implement basic event tracking
5. [ ] Begin WebSocket integration for real-time updates

## Notes

- Implementation details are kept in `/internal-docs`
- Public documentation is kept in `/docs`

## Future Considerations

### Additional Performance Optimizations

- [ ] Implement monitoring metrics:
  - Event storage latency
  - Query performance
  - Storage growth
  - Relationship depth
  - Error rates

### Event Handling and Real-time Features

- [ ] Plan support for parallel execution branches
- [ ] Set up connection management
- [ ] Implement event replay mechanism

### Research Tasks

- Research and evaluate different graph visualization libraries
- Investigate optimal node positioning algorithms
- Study best practices for graph layout algorithms
- Analyze performance implications of different visualization approaches

### Technical Debt Items

- [ ] Original routing update tasks:
  - Update all parameter references in codebase from `traceId` to `workflowId`
  - Ensure backward compatibility during transition
- [ ] Service naming considerations:
  - Document service responsibilities and interfaces
  - Update Agent class to use both services appropriately
  - Ensure proper error handling and recovery in both services
  - Add separate monitoring metrics for each service

### Implementation Details

#### Component Architecture

- ✓ Created modular event components in `components/workflow-runs/events/`
  - Base event styling through Tailwind classes
  - Separate components for each event type (LLM, Tool Call, Error, etc.)
  - Shared utilities for common functionality (text truncation, formatting)
  - Simplified props interface
  - Removed unnecessary wrapper components
  - Added reusable collapsible content pattern

#### Event Type Display

- LLM Response: Truncated content with show more/less functionality
- Tool Call: Tool name and parameters with collapsible JSON
- Tool Response: Formatted response with error handling
- Error: Highlighted error messages with destructive styling
- Default: Fallback for unknown event types

### Learnings and Decisions

#### Layout Structure

- ✓ Container-level spacing is more maintainable than per-event margins
- ✓ Avoid unnecessary div nesting for simpler component structure
- ✓ Mobile-first responsive design with appropriate padding
- ✓ Reduced maximum width improves readability

#### Status Event Display

- ✓ Timestamps always shown (removed conditional display logic)
- ✓ Keep all status updates in muted style
- ✓ Use consistent checkmark icon
- ✓ Simplified component structure with fewer props
