# Clean Architecture in Issue To PR

// TODO: There is already another `/docs/architecture.md` document. This information belongs in that file. Combine the contents of these files, review what is still relevant, and clean up.

This document describes how Clean Architecture is structured and applied across the repository. It replaces older notes that previously lived in `shared/README.md`.

## Overview

We separate concerns into four layers. The direction of dependencies always points inward (outer layers depend on inner layers, never the reverse).

// TODO: Fix mermaid compilation syntax error

```mermaid
flowchart TB
  subgraph Application Layer [/apps/]
    A1[nextjs]
    A2[worker]
  end

  subgraph Business Logic Layer [/shared/src/lib]
    L1[RepositoryService]
    L2[AuthenticationService]
    L3[Workflow Use Cases]
  end

  subgraph Core Layer [/shared/src/core]
    C1[entities]
    C2[ports]
  end

  subgraph Adapters Layer [/shared/src/adapters]
    D1[GitHubAdapter]
    D2[RepositoryAdapter]
    D3[RedisAdapter]
    D4[GitAdapter]
    D5[FileSystemAdapter]
    D6[AuthenticationAdapter]
  end

  A1 --> L1
  A1 --> L3
  A2 --> L1
  A2 --> L3

  L1 --> C1
  L1 --> C2
  L2 --> C1
  L2 --> C2
  L3 --> C1
  L3 --> C2

  D1 --> C2
  D2 --> C2
  D3 --> C2
  D4 --> C2
  D5 --> C2
  D6 --> C2
```

## Layer Responsibilities

### `shared/src/core` — Domain Layer

- Purpose: Pure domain logic and interface contracts
- Rules:
  - Only domain entities and TypeScript interfaces
  - No external dependencies
  - No imports from other layers
- Examples: `Repository`, `AuthSession`, ports like `AuthenticationPort`, `GitPort`, `FileSystemPort`

### `shared/src/lib` — Business Logic Layer

- Purpose: Orchestrates domain entities and ports to implement use cases
- Rules:
  - Can import from `shared/src/core` only
  - Cannot import from adapters or applications
  - Uses dependency injection with ports
- Examples: `RepositoryService`, `WorkerService`, workflows/use-cases

### `shared/src/adapters` — Infrastructure Layer

- Purpose: Concrete implementations of the ports defined in `core/ports`
- Rules:
  - Can import from `shared/src/core` only
  - Cannot import from `shared/src/lib` or `/apps`
  - Own the external world (APIs, databases, files, network)
- Examples: `GitHubAdapter`, `RedisAdapter`, `BullMQAdapter`, `FileSystemAdapter`, `AuthenticationAdapter`, `GitAdapter`

### `/apps` — Application Layer

- Purpose: Runtime applications and composition root
- Rules:
  - May import from any layer
  - Responsible for dependency wiring and configuration
  - Handles application-specific concerns (routing, UI, job runners)
- Examples: `apps/nextjs`, `apps/worker`

## Dependency Rules

```
Allowed
  /apps → /shared/src/lib, /shared/src/core, /shared/src/adapters
  /shared/src/lib → /shared/src/core
  /shared/src/adapters → /shared/src/core

Forbidden
  /shared/src/lib → /shared/src/adapters or /apps
  /shared/src/adapters → /shared/src/lib or /apps
  /shared/src/core → any other layer
```

## Composition Root and Dependency Injection

Each application acts as a composition root where concrete adapters are wired to business logic via ports:

- `apps/worker/src/index.ts`: bootstraps queues/jobs and constructs services like `WorkerService`, injecting concrete adapters (e.g., `BullMQAdapter`, `RedisAdapter`).
- `apps/nextjs` (App Router): server actions and API routes construct use cases/services by passing concrete adapters (e.g., `GitHubAdapter`, `FileSystemAdapter`).

Recommended approach:

1. Define or reuse ports in `shared/src/core/ports`.
2. Implement adapters in `shared/src/adapters` that satisfy those ports.
3. In the app entry points, instantiate adapters and pass them into services in `shared/src/lib`.

This keeps the business logic completely independent of infrastructure choices.

## Port Granularity Guidance

Ports should model capabilities, not specific products, and not an over-generic "any database" abstraction.

- Prefer capability‑specific ports that match how the domain uses the dependency.
- Examples:
  - `KeyValueStorePort` (for cache/state like Redis)
  - `GraphStorePort` (for relationship queries like Neo4j)
  - `RelationalStorePort` or more specific `DraftContentPort` (for structured/draft content in Postgres)
  - `MessageQueuePort` (for job/queueing abstractions)
- Benefits:
  - Clear contracts that reflect usage
  - Easier testing and swapping implementations
  - Avoids leaky abstractions that try to unify fundamentally different data models

If a single application currently uses Redis for multiple roles (cache, pub/sub, queues), split the contract into multiple ports even if they share one adapter under the hood. This helps tests and future migrations.

## Migration Notes (From legacy `lib/` code)

The existing `lib/` in the app runtime contains mixed responsibilities. We are migrating incrementally to `shared/` with clear boundaries:

1. Start with entities in `shared/src/core/entities` if new domain data/behavior is needed.
2. Define ports in `shared/src/core/ports` for external dependencies.
3. Implement business logic in `shared/src/lib` using only the ports.
4. Create adapters in `shared/src/adapters` that implement the ports.
5. Wire everything in `/apps` entry points.

During migration, avoid importing `shared/src/adapters` from `shared/src/lib`. Keep seams clear so parts can be moved without churn.

## Where to Place Composite Root Code

- `apps/worker/src/index.ts` initializes workers/queues and composes services.
- `apps/nextjs` composes dependencies in API routes and server actions; prefer small factory helpers if multiple routes need the same wiring.

## References

- High-level system architecture: `docs/guides/architecture.md`
- Data flow and databases: `docs/guides/databases/`
- Adapters and ports live in `shared/src/{adapters,core/ports}`
