# Clean Architecture Target State

## Overview

This document outlines the target architecture for the Issue-to-PR application, following clean architecture and domain-driven design principles. This serves as a north star for gradual migration during future development.

## Core Principles

### 1. Dependency Rule

- Source code dependencies point inward toward higher-level policies
- Inner layers know nothing about outer layers
- Business rules don't depend on external concerns

### 2. Separation of Concerns

- **Domain Layer**: Business logic and rules
- **Application Layer**: Use cases and orchestration
- **Infrastructure Layer**: External dependencies and data access
- **Presentation Layer**: UI and API interfaces

### 3. Testability

- Each layer can be tested in isolation
- Dependencies can be easily mocked
- Business logic is independent of frameworks

## Layer Responsibilities

### Domain Layer (`/lib/domain/`)

**Purpose**: Contains enterprise business rules and entities

**Responsibilities**:

- Define core business entities (Issue, Repository, WorkflowRun, Agent)
- Implement business rules and domain logic
- Define repository interfaces (no implementations)
- Domain services for complex business operations

**Dependencies**: None (pure TypeScript/JavaScript)

**Examples**:

```typescript
// lib/domain/entities/Issue.ts
export class Issue {
  canBeAutoResolved(): boolean {
    return this.state === IssueState.Open && this.hasValidDescription()
  }
}

// lib/domain/services/IssueResolutionService.ts
export class IssueResolutionService {
  async validateResolutionRequirements(
    issue: Issue
  ): Promise<ValidationResult> {
    // Business logic for determining if issue can be resolved
  }
}
```

### Application Layer (`/lib/application/`)

**Purpose**: Contains application-specific business rules and use cases

**Responsibilities**:

- Orchestrate domain objects to fulfill use cases
- Define application services
- Handle cross-cutting concerns (transactions, events)
- Define DTOs for data transfer

**Dependencies**: Domain layer only

**Examples**:

```typescript
// lib/application/usecases/AutoResolveIssueUseCase.ts
export class AutoResolveIssueUseCase {
  async execute(
    request: AutoResolveIssueRequest
  ): Promise<AutoResolveIssueResponse> {
    // Orchestrate domain services and repositories
  }
}
```

### Infrastructure Layer (`/lib/infrastructure/`)

**Purpose**: Contains implementations of external dependencies

**Responsibilities**:

- Repository implementations (Neo4j, GitHub API)
- External service clients (OpenAI, Docker)
- Database schemas and migrations
- File system operations
- Agent tools implementations

**Dependencies**: Domain and Application layers

**Examples**:

```typescript
// lib/infrastructure/repositories/Neo4jIssueRepository.ts
export class Neo4jIssueRepository implements IIssueRepository {
  async getByNumber(issueNumber: number, repoFullName: string): Promise<Issue> {
    // Neo4j specific implementation
  }
}
```

### Presentation Layer (`/app/`, `/components/`)

**Purpose**: Handles user interface and external API interactions

**Responsibilities**:

- React components and UI logic
- API route handlers
- Input validation and serialization
- Authentication and authorization
- State management

**Dependencies**: Application layer (through dependency injection)

## Monorepo Structure

```
issue-to-pr/
├── app/                          # Next.js app router (Presentation Layer)
│   ├── api/                      # API route handlers
│   ├── [username]/[repo]/        # Page components
│   └── globals.css
├── components/                   # React components (Presentation Layer)
│   ├── ui/                       # Shared UI components
│   ├── issues/                   # Issue-specific components
│   └── common/                   # Common business components
├── lib/                          # Core application code
│   ├── domain/                   # 🆕 Domain layer (NEW)
│   │   ├── entities/
│   │   ├── services/
│   │   └── repositories/         # Interfaces only
│   ├── application/              # 🆕 Application layer (NEW)
│   │   ├── usecases/
│   │   ├── services/
│   │   └── dtos/
│   ├── infrastructure/           # 🆕 Infrastructure layer (REORGANIZED)
│   │   ├── repositories/         # Implementations
│   │   ├── clients/              # External service clients
│   │   ├── tools/                # Agent tools (existing)
│   │   └── database/             # Database specific code
│   ├── shared/                   # Cross-layer utilities
│   │   ├── types/                # Shared types (existing)
│   │   ├── utils/                # Pure utility functions
│   │   └── constants/
│   └── legacy/                   # 🆕 Temporary home for existing code during migration
│       ├── agents/               # Existing agent code
│       ├── workflows/            # Existing workflow code
│       └── github/               # Existing GitHub integrations
├── services/                     # Other microservices
│   ├── worker/                   # Background job processing
│   ├── queue-manager/            # Queue management
│   └── shared/                   # Shared code between services
└── docs/
    └── guides/
        └── clean-architecture-target.md  # This document
```

## Migration Strategy

### Phase 1: Documentation and Foundation

- [x] Create this target architecture document
- [ ] Create migration guidelines for developers
- [ ] Set up basic folder structure
- [ ] Create interfaces for key domain concepts

### Phase 2: Domain Layer Extraction

- [ ] Extract Issue entity from existing code
- [ ] Extract Repository entity
- [ ] Create domain services for core business logic
- [ ] Define repository interfaces

### Phase 3: Application Layer Creation

- [ ] Create use cases for main workflows
- [ ] Extract orchestration logic from existing workflows
- [ ] Implement dependency injection container
- [ ] Create application services

### Phase 4: Infrastructure Reorganization

- [ ] Move existing tools to infrastructure layer
- [ ] Create repository implementations
- [ ] Extract external service clients
- [ ] Reorganize database access code

### Phase 5: Presentation Layer Cleanup

- [ ] Simplify React components to pure UI
- [ ] Update API routes to use application layer
- [ ] Implement proper error handling
- [ ] Clean up component dependencies

## Guidelines for Future Development

### When Adding New Features

1. **Start with Domain**: Define entities and business rules first
2. **Create Use Case**: Implement application-level orchestration
3. **Infrastructure Last**: Add external dependencies as needed
4. **Test Layers Separately**: Unit test domain, integration test infrastructure

### When Fixing Bugs

1. **Identify Layer**: Determine which layer contains the bug
2. **Fix at Source**: Don't add workarounds in higher layers
3. **Add Tests**: Prevent regression at the appropriate layer

### When Refactoring

1. **Extract Domain Logic**: Move business rules to domain layer
2. **Simplify Dependencies**: Reduce coupling between layers
3. **Improve Testability**: Make dependencies injectable

## Key Interfaces to Implement

```typescript
// Domain layer interfaces
interface IIssueRepository {
  getByNumber(issueNumber: number, repoFullName: string): Promise<Issue>
  save(issue: Issue): Promise<void>
}

interface IWorkflowRepository {
  getById(id: string): Promise<WorkflowRun>
  save(workflowRun: WorkflowRun): Promise<void>
}

interface IContainerService {
  createWorkspace(config: WorkspaceConfig): Promise<ContainerWorkspace>
  cleanup(workspaceId: string): Promise<void>
}

// Application layer interfaces
interface IEventPublisher {
  publish(event: DomainEvent): Promise<void>
}

interface IPermissionService {
  checkCanResolveIssue(issueNumber: number, repoFullName: string): Promise<void>
}
```

## Next Steps

1. Review this document with the team
2. Create initial folder structure
3. Begin extracting domain entities from existing code
4. Implement dependency injection for new features
5. Gradually migrate existing code during regular development

This migration should be done incrementally, with each commit moving us closer to the target state without breaking existing functionality.
