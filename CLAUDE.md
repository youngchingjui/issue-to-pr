# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

**Always use `pnpm` for running commands, not `npm` or `npx`.**

- Run scripts: `pnpm <script-name>` (e.g., `pnpm test`, `pnpm lint`)
- Execute packages: `pnpm exec <package>` or `pnpm dlx <package>` (not `npx`)
- Install dependencies: `pnpm install`

## Code Guidelines

- Look for commands in package.json to understand how to run testing and linting.
- For typescript, avoid typecasting. If you're resorting to typecasting, it's usually a sign you haven't thought carefully enough about the inferred type. We want this codebase to be as strongly typed as possible.

- This is a monorepo. The NextJS application currently sits in the root directory, with files in the /components and /lib directories supporting it. But we'd like to move the NextJS application to the /apps/web directory.
- We have a /shared folder where shared code between the NextJS application and the workers lives.
- Be sure to refer to config files to see how we run scripts, run typechecks, etc.
- We want good, clean code
- We want easy, clear code file organization. Any new joiner should be able to quickly understand where to find a file.
- We'll scatter additional specific guidance throughout the codebase. Look for README.md in nested folders, sitting close to any code they might be referencing.
- When reviewing files or editing files, try to look for any relevant README.md files nearby that might give context about the direction of the code.

## README Index

- `__tests__/README.md` - How to run tests (unit, LLM/manual, Neo4j integration)
- `__tests__/shared/adapters/neo4j/README.md` - Neo4j integration test setup
- `.github/README.md` - GitHub Actions workflow for worker Docker builds
- `apps/workers/workflow-workers/README.md` - BullMQ worker setup and env vars
- `apps/openai-realtime-agents/README.md` - OpenAI Realtime API demo app
- `docker/README.md` - Docker configuration and compose files
- `docs/README.md` - Main documentation index
- `docs/components/README.md` - React components and patch tool format
- `docs/internal/README.md` - Internal planning and architecture docs
- `lib/README.md` - Backend/domain layer organization
- `lib/neo4j/README.md` - Neo4j data access layer (repos vs services)
- `lib/tools/README.md` - LLM-callable tool creation patterns
- `lib/types/README.md` - Type/schema conventions with Zod
- `lib/workflows/README.md` - Workflow debugging guide
- `scripts/migrations/README.md` - Database migration scripts
- `shared/src/adapters/neo4j/README.md` - Neo4j db-level types
- `shared/src/lib/README.md` - Migration notes (old lib → shared)
