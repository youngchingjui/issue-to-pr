# Shared Module

This package contains code shared across applications (`/apps/nextjs` and `/apps/worker`). It follows our Clean Architecture structure.

## What lives here

- `src/core`: domain entities and ports (pure TypeScript, no external deps)
- `src/lib`: business logic and use cases that depend only on ports
- `src/adapters`: infrastructure implementations of ports

For the full architecture guide (layers, ports & adapters, composition root, migration strategy), see:

- `docs/code-architecture.md`

## Dependency rules (summary)

```
/apps → /shared/src/lib, /shared/src/core, /shared/src/adapters
/shared/src/lib → /shared/src/core
/shared/src/adapters → /shared/src/core
```

Avoid cross-layer imports not listed above.
