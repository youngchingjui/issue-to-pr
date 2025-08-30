# Code Structure

This document outlines the organization and purpose of each directory in the project.

## Root Directory Structure

```
/
├── app/                    # Next.js App Router pages and layouts
├── apps/                  # Apps in monorepo structure, including /apps/workers and any future additional apps. NextJS should be in here too, but for legacy reasons, NextJS lives in root.
├── components/            # Reusable React components
├── lib/                   # (deprecated) Most should be moved to `shared/`. Remaining is mostly for NextJS app.
├── shared/                # Framework-agnostic domain + ports/adapters/services/utils
├── public/               # Static assets for NextJS app
├── docs/                 # Project documentation
├── scripts/              # Utility and automation scripts
├── __tests__/           # Test files
└── docker/              # Docker configuration files
```

## Key Directories Explained

### `/app`

Contains Next.js App Router pages, layouts, and API routes. This is where the NextJS application routing and page components live.

### `/components`

Reusable React components used throughout the application. These are shared UI elements that can be imported and used across different pages.

### `/lib`

Deprecated. We're trying to move most of this functionality to `/shared`, so that both NextJS, workers, and other applications can use them. Anything remaining will be NextJS-specific.

### `/shared`

Framework-agnostic code that is reused across apps. Tries to best follow "clean architecture" and "hexagonal architecture" principles.

```
/shared
└── src
    ├── entities/    # Domain entities (state + invariants + pure behavior). No imports from ports/services/adapters.
    ├── ports/       # Interfaces for external systems (LLM, GitHub, tools, storage). Can only import from entities.
    ├── services/    # Application services orchestrating entities via ports. Can only import from entities and ports.
    ├── adapters/    # Implementations of ports (OpenAI/Anthropic/GitHub/etc.)
    └── utils/       # Pure, side-effect-free functions; no IO
```

Guidelines:

- Entities must not import from `ports`, `services`, or `adapters`.
- Services may depend on `entities` and `ports`, but not `adapters` or provider SDKs.
- Adapters implement `ports` and may depend on provider SDKs; they must not import `services`.
- utils can be used anywhere, but must remain pure (no IO, no framework imports).
- Avoid barrel files; import from concrete modules for clear dependency graphs.

### `/docs`

Project documentation, including:

- Architecture guides
- Setup instructions
- API documentation
- Development guidelines

### `/scripts`

Utility scripts for:

- Development tasks
- Deployment automation
- Database management
- Testing helpers

### `/__tests__`

Should follow the same structure as the file being tested. i.e. if you have a file in `/shared/src/entities/agent.ts`, you should have a test file in `/__tests__/shared/entities/agent.test.ts`.

### `/docker`

Docker-related configuration:

- Dockerfile(s)
- Docker Compose files
- Container configuration

## Configuration Files

- `auth.ts`: Authentication configuration
- `middleware.ts`: Next.js middleware
- `next.config.js`: Next.js configuration
- `tailwind.config.ts`: Tailwind CSS configuration
- `.env.local`: Environment variables (not tracked in git)
- `tsconfig.json`: TypeScript configuration
- `.eslintrc.json`: ESLint configuration
- `.prettierrc`: Prettier configuration

## Special Files

- `package.json`: Project dependencies and scripts
- `pnpm-lock.yaml`: Package lock file (using pnpm)
- `components.json`: Shadcn/ui components configuration

## Best Practices

1. **Component Organization**

   - Keep components focused and single-responsibility
   - Use appropriate subdirectories for related components
   - Keep simple, single-use logic inline within components
   - Create shared utilities only for truly reusable logic
   - Avoid premature abstraction
   - Use Tailwind's utility classes for consistent spacing
   - Minimize wrapper div nesting for simpler component structure

2. **Testing**

   - Place all tests in the `__tests__` directory.
   - Follow the testing patterns established in `__tests__`
   - Test complex logic thoroughly
   - Keep test structure simple for straightforward code

3. **Documentation**
   - Keep documentation up-to-date in `/docs`
   - Document complex workflows and architecture decisions
   - Document the reasoning behind architectural decisions
   - Update documentation when implementation patterns change

```

```
