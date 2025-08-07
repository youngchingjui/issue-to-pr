# Clean Architecture Implementation

This folder contains shared code across all applications (`/apps/nextjs` and `/apps/worker`) following Clean Architecture principles.

## Architecture Overview

// TODO: Ideally this should be a mermaid diagram
// TODO: Think about how and where the composite root sits. If we follow depency injection principles, then there should be a place where we actually import all of the adapters to actually run workflows, business logic, etc.

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   /apps/    │  │   /apps/    │  │   /apps/    │        │
│  │   nextjs    │  │   worker    │  │   (future)  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ imports
┌─────────────────────────────────────────────────────────────┐
│                  Business Logic Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    /lib/    │  │    /lib/    │  │    /lib/    │        │
│  │RepositorySvc│  │  AuthSvc    │  │  Workflow   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ imports
┌─────────────────────────────────────────────────────────────┐
│                     Core Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  /entities  │  │   /ports    │  │   /ports    │        │
│  │ Repository  │  │RepositoryPort│  │  AuthPort   │        │
│  │   Session   │  │  FilePort    │  │  RedisPort  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ implemented by
┌─────────────────────────────────────────────────────────────┐
│                  Adapters Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ /adapters/  │  │ /adapters/  │  │ /adapters/  │        │
│  │RepositoryAdp│  │  GitHubAdp  │  │  RedisAdp   │        │
│  │  FileAdp    │  │  AuthAdp    │  │  GitAdp     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### `/core` - Domain Layer

The innermost layer containing your domain logic and interface contracts.

// TODO: We need a note somewhere to suggest that we will only slowly migrate our existing `/lib` folder to this new `/shared` architecture. Currently, the `/lib` folder has a lot of code that does not separate concerns, has lots of depencencies on other layers, and is not well organized. So we'll slowly 1-by-1 re-write them to follow good coding principles, and save them in the correct folders.

#### `/core/entities`

- **Purpose**: Pure domain objects with business logic
- **Rules**:
  - Only contain data and methods that operate on that data
  - No external dependencies
  - No imports from other layers
- **Examples**: `Repository`, `AuthSession`, `User`

#### `/core/ports`

- **Purpose**: Interface contracts for external dependencies
- **Rules**:
  - Only TypeScript interfaces
  - Define contracts for external systems (databases, APIs, file system)
  - No concrete implementations
- **Examples**: `RepositoryPort`, `AuthenticationPort`, `FileSystemPort`

// QUESTION: I'm confused by at what level to abstract the ports.
// For example, if we have a connector to a redis database, is it an abstraction over which redis database we're using, or should it also abstract to the level of the type of database (ie postgres, etc.)?
// So should it just be a generic port for any type of database (in-memory, relational database, nosql, etc.)? Or should it be more specific to a type of database...?

### `/lib` - Business Logic Layer

Contains your application's core business logic and use cases.

- **Purpose**: Orchestrates domain entities and external services
- **Rules**:
  - Can import from `/core` only
  - Cannot import from `/adapters` or `/apps`
  - Uses dependency injection with ports
  - Contains business workflows and services
- **Examples**: `RepositoryService`, `AuthenticationService`

### `/adapters` - Infrastructure Layer

Concrete implementations of the ports defined in `/core/ports`.

- **Purpose**: Handle actual external connections and implementations
- **Rules**:
  - Can import from `/core` only
  - Cannot import from `/lib` or `/apps`
  - Implements interfaces from `/core/ports`
  - Contains actual API calls, database connections, etc.
- **Examples**: `RepositoryAdapter`, `GitHubAdapter`, `RedisAdapter`

### `/apps` - Application Layer

Your runtime applications that use the business logic.

- **Purpose**: Application entry points and configuration
- **Rules**:
  - Can import from any layer
  - Contains dependency injection setup
  - Handles application-specific concerns (routing, UI, etc.)

## Dependency Rules

```
✅ Allowed Dependencies:
├── /apps → /lib, /core, /adapters
├── /lib → /core
├── /adapters → /core
└── /core → (no external dependencies)

❌ Forbidden Dependencies:
├── /lib → /adapters
├── /lib → /apps
├── /adapters → /lib
├── /adapters → /apps
└── /core → any external layer
```

## Benefits

1. **Testability**: Easy to mock ports for unit testing business logic
2. **Flexibility**: Swap implementations without changing business logic
3. **Maintainability**: Changes to infrastructure don't affect domain logic
4. **Separation of Concerns**: Clear boundaries between layers
5. **Dependency Inversion**: High-level modules don't depend on low-level modules

## Migration Guide

When adding new functionality:

1. **Start with entities** in `/core/entities` if you need new domain objects
2. **Define ports** in `/core/ports` for external dependencies
3. **Implement business logic** in `/lib` using the ports
4. **Create adapters** in `/adapters` for actual implementations
5. **Wire everything up** in your application layer
