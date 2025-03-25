# Documentation Reorganization Plan

## Overview

This document outlines the step-by-step plan to reorganize the documentation structure to improve clarity, reduce overlap, and establish a clear hierarchy of information.

## Phase 1: Directory Structure Setup

- [x] 1. Verify all required directories exist:
  ```
  docs/
  ├── README.md
  ├── guides/
  │   ├── databases/
  │   └── user-stories/
  ├── setup/
  ├── api/
  ├── components/
  └── code-structure.md
  ```
- [x] 2. Create new directories if needed:
  - `docs/guides/databases/`

## Phase 2: Content Reorganization

### Step 1: High-Level Architecture

- [x] 1. Update `architecture.md`:
  - Keep only high-level system overview
  - Technology stack listing
  - Component interaction diagrams
  - Remove detailed implementation specifics
  - Add clear links to detailed docs

### Step 2: Database Documentation

- [x] 1. Create new database-specific files:
  - `guides/databases/neo4j-architecture.md`
  - `guides/databases/redis-architecture.md`
  - `guides/databases/data-flow.md`
- [x] 2. Move content from `database-architecture.md`:
  - Neo4j-specific content → `neo4j-architecture.md`
  - Redis-specific content → `redis-architecture.md`
  - Data flow and interaction → `data-flow.md`
- [x] 3. Delete original `database-architecture.md` after migration

### Step 3: Development Planning

- [ ] 1. Move `development-plan.md` to setup:
  - Create `setup/implementation-stages.md`
  - Transfer implementation details
  - Update references in other docs
- [ ] 2. Delete original `development-plan.md` after migration

### Step 4: User Stories and Technical Specs

- [ ] 1. Review `user-stories/workflow-visualization.md`:
  - Keep user requirements and acceptance criteria
  - Move technical implementation details to appropriate guides
  - Update cross-references

### Step 5: Langfuse Integration

- [ ] 1. Add Langfuse to architecture.md:
  - Add to Technology Stack section
  - Update component descriptions
  - Add observability section
- [ ] 2. Create `guides/observability.md`:
  - Document Langfuse integration details
  - Describe monitoring capabilities
  - Add configuration instructions
- [ ] 3. Update cross-references:
  - Link from AI integration docs
  - Add to implementation stages
  - Update relevant guides

### Step 6: Diagram Migration

- [ ] 1. Create component diagram in assets:
  - Create `assets/component-interactions.md`
  - Move mermaid diagram from architecture.md
  - Add more detailed component descriptions
- [ ] 2. Update architecture.md:
  - Replace inline diagram with reference
  - Add link to detailed diagram
  - Ensure consistent terminology
- [ ] 3. Improve data flow diagram timing:
  - Show events can be generated right after workflow init
  - Move "Fetch missed events" after some events are generated
  - Clarify event history replay sequence
  - Add note about event buffering during connection setup
- [ ] 4. Clarify background persistence:
  - Document parallel processing pattern
  - Explain relationship between Redis queue and Neo4j storage
  - Add notes about persistence guarantees
  - Show error handling in background jobs

## Phase 3: Content Cleanup

### Step 1: Cross-Reference Updates

- [ ] 1. Update all internal links in:
  - README.md files
  - Guide documents
  - Setup instructions
  - API documentation

### Step 2: Conflict Resolution

- [ ] 1. Resolve technology conflicts:
  - Clarify Redis vs Neo4j responsibilities
  - Document real-time update strategy (SSE vs WebSocket)
  - Update implementation stages to match across all docs

### Step 3: Content Validation

- [ ] 1. Review all documents for:
  - Accurate cross-references
  - Consistent terminology
  - Up-to-date information
  - Proper formatting

## Phase 4: Documentation Improvements

### Step 1: Navigation Enhancement

- [ ] 1. Update main README.md:
  - Clear navigation structure
  - Updated links to new locations
  - Quick start guide
  - High-level project overview

### Step 2: Style Consistency

- [ ] 1. Apply consistent formatting:
  - Markdown styling
  - Code block formatting
  - Header hierarchy
  - Link formatting

## Success Criteria

1. No duplicate information across documents
2. Clear separation of concerns
3. Accurate cross-references
4. Consistent terminology
5. Logical information hierarchy
6. Easy navigation between documents

## Notes

- Complete each phase before moving to the next
- Update this document as changes are made
- Mark tasks as completed using [x]
- Add new tasks as needed during implementation

## Finally

- [ ] At the end of this document, if every item is checked off, then delete this document.
