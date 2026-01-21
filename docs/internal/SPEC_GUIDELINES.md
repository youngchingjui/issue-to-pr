# Specification Document Guidelines

This document describes how to write and maintain specification documents in `/docs/internal/`.

## Purpose

Specifications describe **how we want the application to behave**, not how it currently behaves. They define the target state we're building toward.

## Principles

### Describe the target, not the current state

- Write as if describing the finished product
- Avoid phrases like "currently we do X" or "today this works by..."
- The codebase is the source of truth for current behavior; specs are the source of truth for intended behavior

### Use specifications as a reference when building

When implementing features or fixing bugs, compare the current implementation against relevant specs to ensure alignment. If the spec and implementation diverge, either:

1. Update the implementation to match the spec, or
2. Update the spec if requirements have changed (with clear rationale)

### Keep specifications stable but not frozen

Specs should change deliberately, not constantly. When updating a spec:

- Make changes intentionally, not as a side effect of implementation
- Document significant changes and reasoning
- Ensure the team is aligned on spec changes before implementation

### Be specific enough to guide implementation

Specs should answer questions developers will have:

- What are the expected behaviors?
- What are the edge cases?
- What are the constraints and requirements?
- What decisions have been made (and why)?

### Capture open questions explicitly

If something is undecided, say so. An "Open Questions" section is better than ambiguity or premature decisions.

## Structure

A typical specification includes:

1. **Overview** - What this spec covers and why it matters
2. **Requirements/Behavior** - The detailed target state
3. **Constraints** - Limitations, dependencies, security considerations
4. **Open Questions** - Unresolved decisions that need input

## Naming

Use descriptive names that indicate scope:

- `github-webhook-workflows.md` - Spec for webhook-triggered workflows
- `workflow-runs-tech-specs.md` - Technical spec for workflow execution
- `PRD.md` - Product requirements document

## Review process

Specifications should be reviewed and agreed upon before significant implementation work begins. Treat spec review with the same rigor as code review.
