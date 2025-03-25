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

- [x] 1. Move `development-plan.md` to setup:
  - Create `setup/implementation-stages.md`
  - Transfer implementation details
  - Update references in other docs
- [x] 2. Delete original `development-plan.md` after migration

### Step 4: User Stories and Technical Specs

- [x] 1. Review `user-stories/workflow-visualization.md`:
  - Keep user requirements and acceptance criteria
  - Move technical implementation details to appropriate guides
  - Update cross-references

### Step 5: Langfuse Integration

- [x] 1. Add Langfuse to architecture.md:
  - Add to Technology Stack section
  - Update component descriptions
  - Add observability section
- [x] 2. Create `guides/observability.md`:
  - Document Langfuse integration details
  - Describe monitoring capabilities
  - Add configuration instructions
- [x] 3. Update cross-references:
  - Link from AI integration docs
  - Add to implementation stages
  - Update relevant guides

### Step 6: Diagram Migration

- [x] 1. Keep Mermaid diagrams inline:
  - ✓ Mermaid diagrams must be written directly in markdown files using ```mermaid code blocks
  - ✓ Updated architecture.md with inline component diagram
  - ✓ Updated README.md to clarify Mermaid diagram usage
- [ ] 2. Update architecture.md:
  - Add clear section headers
  - Ensure consistent terminology
  - Add descriptive component explanations
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

Note: The `/assets` directory should only contain static image files (`.svg`, `.png`, `.jpg`). All Mermaid diagrams should be written directly in the relevant markdown files.

## Phase 3: Public/Internal Documentation Separation

### Step 1: Create Internal Documentation Structure

- [ ] 1. Create new internal documentation directory:
  ```
  internal/
  ├── README.md
  ├── planning/
  │   ├── implementation/
  │   └── architecture/
  ├── decisions/
  └── roadmap/
  ```
- [ ] 2. Create internal README.md:
  - Add explanation of internal vs public docs
  - Document folder structure
  - Add guidelines for internal documentation

### Step 2: Move Implementation Documents

- [ ] 1. Move implementation-related files:
  - Move `setup/implementation-stages.md` → `internal/planning/implementation/stages.md`
  - Move `guides/workflow-visualization-implementation.md` → `internal/planning/implementation/workflow-visualization.md`
  - Update all cross-references to these files

### Step 3: Clean Up Public Docs

- [ ] 1. Review and update `/docs` content:
  - Remove any internal planning details
  - Keep only end-user focused content
  - Update language to be more user-friendly
  - Remove technical implementation details

### Step 4: Update Cross References

- [ ] 1. Fix broken links:
  - Search for references to moved files
  - Update all internal document links
  - Verify no public docs link to internal docs
  - Update import paths in code if needed

### Step 5: Documentation Guidelines

- [ ] 1. Create documentation guidelines:
  - Create `internal/README.md` with internal docs guidelines
  - Create `docs/CONTRIBUTING.md` with public docs guidelines
  - Document the separation between public/internal
  - Add examples of what belongs where

### Step 6: Migration Verification

- [ ] 1. Verify documentation structure:
  - Check all files are in correct locations
  - Verify all links work
  - Ensure no implementation details in public docs
  - Confirm all cross-references are updated

### Step 7: Update Development Workflow

- [ ] 1. Update development process:
  - Add documentation guidelines to PR template
  - Create checklist for doc updates
  - Add verification step for doc location
  - Update relevant CI/CD checks

## Success Criteria

1. Clear separation between public and internal documentation
2. All implementation details moved to internal folder
3. Public docs focus solely on end-user needs
4. No broken cross-references
5. Clear guidelines for future documentation
6. Development process updated to maintain separation

## Notes

- Complete each step sequentially
- Update this document as changes are made
- Mark tasks as completed using [x]
- Add new tasks as needed during implementation

## Finally

- [ ] At the end of this document, if every item is checked off, then move this file to a "completed" folder, or something similar.
