# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

**Always use `pnpm` for running commands, not `npm` or `npx`.**

- Run scripts: `pnpm <script-name>` (e.g., `pnpm test`, `pnpm lint`)
- Execute packages: `pnpm exec <package>` or `pnpm dlx <package>` (not `npx`)
- Install dependencies: `pnpm install`
- For TypeScript type checks, run `pnpm tsc`.

## Code Guidelines

- **Never run `git add`** - let the user handle staging
- Look for commands in package.json to understand how to run testing and linting.
- For typescript, avoid typecasting. If you're resorting to typecasting, it's usually a sign you haven't thought carefully enough about the inferred type. We want this codebase to be as strongly typed as possible.

- This is a monorepo. The NextJS application currently sits in the root directory, with files in the /components and /lib directories supporting it. But we'd like to move the NextJS application to the /apps/web directory.
- We have a /shared folder where shared code between the NextJS application and the workers lives.
- We want good, clean code
- We want easy, clear code file organization. Any new joiner should be able to quickly understand where to find a file.
- We'll scatter additional specific guidance throughout the codebase. Look for README.md in nested folders, sitting close to any code they might be referencing.
- When reviewing files or editing files, try to look for any relevant README.md files nearby that might give context about the direction of the code.

## Workflow for Making Changes

Before implementing fixes or features, follow this process:

1. **Review existing documentation first** - Check for relevant specs in `/docs/specs/`, README files near the code, and inline documentation that describes expected behavior
2. **Understand expected behavior** - Clarify what the feature should do from a user perspective, separate from technical implementation details
3. **Compare GitHub issues** - Search for related issues, bugs, or gaps to understand the full scope before making changes

### Documentation Categories

We maintain two types of documentation:

- **User-facing docs**: Describe what users see and how they can use features (no code examples, readable by non-technical people)
- **Technical architecture docs**: Describe implementation details that support user-facing features

## Writing specs

Specifications for the application should be first saved in `/docs/specs/`. We should have separate `.md` files for each spec.

Specs should be written in a very simple way that's easy to read and understand.

They should remain very short and simple.

They should only include non-obvious information.

We would likely not want to see any code examples in the specs. This should just be human readable to a non-technical person.

## README Index

- `__tests__/README.md` - How to run tests (unit, LLM/manual, Neo4j integration)
- `__tests__/shared/adapters/neo4j/README.md` - Neo4j integration test setup
- `.github/README.md` - GitHub Actions workflow for worker Docker builds
- `apps/workers/workflow-workers/README.md` - BullMQ worker setup and env vars
- `apps/openai-realtime-agents/README.md` - OpenAI Realtime API demo app
- `docker/README.md` - Docker configuration and compose files
- `docker/nginx/README.md` - NGINX reverse proxy configuration and usage
- `docs/README.md` - Main documentation index
- `docs/deployment/README.md` - Production deployment guide
- `docs/deployment/production-checklist.md` - Production hardening checklist (critical for production deploys)
- `docs/components/README.md` - React components and patch tool format
- `docs/internal/README.md` - Internal planning and architecture docs
- `docs/internal/auth-flow-diagrams.md` - Auth flow Mermaid diagrams and technical docs
- `docs/specs/auth-system.md` - Authentication system specification
- `lib/README.md` - Backend/domain layer organization
- `lib/neo4j/README.md` - Neo4j data access layer (repos vs services)
- `lib/tools/README.md` - LLM-callable tool creation patterns
- `lib/types/README.md` - Type/schema conventions with Zod
- `lib/workflows/README.md` - Workflow debugging guide
- `scripts/migrations/README.md` - Database migration scripts
- `shared/src/adapters/neo4j/README.md` - Neo4j db-level types
- `shared/src/lib/README.md` - Migration notes (old lib → shared)
