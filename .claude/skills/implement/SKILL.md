---
name: implement
description: "Docs-first implementation workflow. Use when building a new feature or making significant changes. Ensures user specs, tech architecture, and gap analysis are in place before writing code. Triggers on: 'implement issue #X', 'build feature X', 'work on #X', or '/implement'."
---

# Docs-First Implementation

Follow this sequence strictly. Do not skip to code.

## Phase 1: Understand

1. **Fetch the issue** — Read the GitHub issue (and parent epic if any) to understand scope
2. **Check existing docs** — Search `docs/user/`, `docs/dev/`, and `docs/specs/` for related documentation
3. **Check existing code** — Explore the codebase to understand what already exists

## Phase 2: Document

Before writing any implementation code:

1. **User spec** (`docs/user/`) — Does a doc exist for this feature area? If not, create one. If yes, does it need updating? The user spec describes what the user sees and does. No code, no technical details, readable by a non-technical person. Keep it short.

2. **Technical architecture** (`docs/dev/`) — Does a doc exist? If not, create one. If yes, does it need updating? The tech doc describes the ideal system design. Use mermaid diagrams. Avoid function names or implementation details that change frequently. This should be durable.

3. **Get user confirmation** — Before proceeding, confirm the specs make sense. Don't assume.

## Phase 3: Plan

1. **Gap analysis** — Compare current codebase to the ideal architecture from Phase 2. What exists? What's missing? What needs to change?
2. **Post the plan to the GitHub issue** — The plan lives in the issue, not as a `.md` file
3. **If the gap is large** — Break into smaller child issues under a parent epic

If the plan covers something not in the user spec or tech architecture, either shrink the plan or update the specs first.

## Phase 4: Implement

1. **Write the code** — Follow the plan
2. **Centralize, don't scatter** — Use registries/config maps for dimension-varying logic (providers, environments). No if-else chains across files.
3. **Write tests that reflect the docs** — Test descriptions should read like the requirements. Use generic test data, not hardcoded vendor values.

## Phase 5: Verify

1. **Type check** — `pnpm tsc`
2. **Test** — `pnpm test`
3. **Lint** — `pnpm lint`
4. **Clean code review** — Run the `code-review` agent to check for scattered logic, hardcoded values, duplicated patterns

## Phase 6: Update docs

1. **Update the README index** in CLAUDE.md if new docs were created
2. **Update the GitHub issue** comment with final implementation summary
