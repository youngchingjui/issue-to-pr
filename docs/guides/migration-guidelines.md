# Migration Guidelines for Clean Architecture

## Overview

This guide provides practical steps for gradually migrating our codebase toward the clean architecture target state. Each developer should follow these guidelines when making changes to ensure we move consistently toward our architectural goals.

## Migration Principles

### 1. Boy Scout Rule

Leave the code better than you found it. Each commit should move us closer to the target architecture, even if it's a small step.

### 2. Incremental Changes

Don't attempt to migrate entire systems at once. Make small, focused changes that can be safely reviewed and deployed.

### 3. Backward Compatibility

Maintain existing functionality during migration. Use adapters and facades when necessary.

## Guidelines by Type of Change

### Adding New Features

When adding new features, follow the clean architecture pattern from the start:

#### Step 1: Define Domain Entities (if needed)

```bash
# Create new domain entities in lib/domain/entities/
touch lib/domain/entities/NewFeature.ts
```

```typescript
// lib/domain/entities/NewFeature.ts
export class NewFeature {
  constructor(
    public readonly id: string,
    public readonly name: string
  ) {}

  // Business logic methods
  isValid(): boolean {
    return this.name.length > 0
  }
}
```

#### Step 2: Create Use Case

```bash
# Create use case in lib/application/usecases/
touch lib/application/usecases/CreateNewFeatureUseCase.ts
```

```typescript
// lib/application/usecases/CreateNewFeatureUseCase.ts
export class CreateNewFeatureUseCase {
  constructor(private readonly repository: INewFeatureRepository) {}

  async execute(request: CreateNewFeatureRequest): Promise<NewFeature> {
    const newFeature = new NewFeature(generateId(), request.name)

    if (!newFeature.isValid()) {
      throw new Error("Invalid feature data")
    }

    await this.repository.save(newFeature)
    return newFeature
  }
}
```

#### Step 3: Create Infrastructure Implementation

```typescript
// lib/infrastructure/repositories/Neo4jNewFeatureRepository.ts
export class Neo4jNewFeatureRepository implements INewFeatureRepository {
  async save(feature: NewFeature): Promise<void> {
    // Neo4j implementation
  }
}
```

#### Step 4: Wire Up in Presentation Layer

```typescript
// app/api/new-feature/route.ts
export async function POST(request: NextRequest) {
  const useCase = new CreateNewFeatureUseCase(new Neo4jNewFeatureRepository())

  const result = await useCase.execute(await request.json())
  return NextResponse.json(result)
}
```

### Fixing Bugs

When fixing bugs, take the opportunity to improve architecture:

#### Before the Fix

1. **Identify the Layer**: Where does the bug actually belong?

   - Business logic bugs → Domain layer
   - Orchestration bugs → Application layer
   - Data access bugs → Infrastructure layer
   - UI bugs → Presentation layer

2. **Check for Architecture Violations**: Is the bug caused by:
   - Business logic in the wrong layer?
   - Tight coupling between layers?
   - Missing abstractions?

#### During the Fix

1. **Extract Business Logic**: If fixing business logic mixed with infrastructure:

```typescript
// ❌ Before (business logic in infrastructure)
async function updateIssue(issueId: string, data: any) {
  const issue = await neo4j.run("MATCH (i:Issue {id: $id}) RETURN i", {
    id: issueId,
  })

  // Business logic mixed with data access
  if (data.state === "closed" && issue.assignee === null) {
    throw new Error("Cannot close unassigned issue")
  }

  await neo4j.run("MATCH (i:Issue {id: $id}) SET i.state = $state", {
    id: issueId,
    state: data.state,
  })
}

// ✅ After (separated concerns)
// Domain entity
class Issue {
  canBeClosed(): boolean {
    return this.assignee !== null
  }

  close(): void {
    if (!this.canBeClosed()) {
      throw new Error("Cannot close unassigned issue")
    }
    this.state = IssueState.Closed
  }
}

// Infrastructure repository
class Neo4jIssueRepository {
  async update(issue: Issue): Promise<void> {
    // Pure data access
  }
}
```

### Refactoring Existing Code

When refactoring, follow this priority order:

#### Priority 1: Extract Domain Entities

Look for classes/objects that represent business concepts:

```typescript
// ❌ Current (data-focused)
interface GitHubIssue {
  number: number
  title: string
  body: string
  state: string
  assignee?: any
}

// ✅ Target (behavior-focused)
class Issue {
  constructor(
    private readonly number: number,
    private readonly title: string,
    private readonly body: string,
    private state: IssueState,
    private assignee?: User
  ) {}

  // Business methods
  assign(user: User): void {
    this.assignee = user
  }

  canBeAutoResolved(): boolean {
    return this.state === IssueState.Open && this.body.length > 10
  }
}
```

#### Priority 2: Extract Use Cases

Look for workflow orchestration code:

```typescript
// ❌ Current (mixed in API route)
export async function POST(request: NextRequest) {
  const { issueNumber, repoFullName } = await request.json()

  // Mixed concerns: validation, business logic, data access
  const apiKey = await getUserOpenAIApiKey()
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 })
  }

  const repo = await getRepoFromString(repoFullName)
  const issue = await getIssue({ fullName: repoFullName, issueNumber })

  await autoResolveIssue({ issue: issue.issue, repository: repo, apiKey })

  return NextResponse.json({ success: true })
}

// ✅ Target (separated concerns)
export async function POST(request: NextRequest) {
  const useCase = container.get<AutoResolveIssueUseCase>(
    "AutoResolveIssueUseCase"
  )

  try {
    const result = await useCase.execute(await request.json())
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

## Practical Migration Steps

### Week 1-2: Foundation

1. Create basic folder structure:

```bash
mkdir -p lib/domain/entities
mkdir -p lib/domain/services
mkdir -p lib/domain/repositories
mkdir -p lib/application/usecases
mkdir -p lib/application/services
mkdir -p lib/application/dtos
mkdir -p lib/infrastructure/repositories
mkdir -p lib/infrastructure/clients
mkdir -p lib/shared/types
mkdir -p lib/legacy
```

2. Move existing code to legacy folder (no functionality changes):

```bash
# Create legacy folder and move existing code
mkdir -p lib/legacy
mv lib/agents lib/legacy/
mv lib/workflows lib/legacy/
# Keep lib/tools for now as they'll become infrastructure
```

### Week 3-4: Extract First Domain Entity

1. Pick the most central business concept (probably `Issue`)
2. Extract it from existing types
3. Add business methods
4. Update one use case to use the new entity

### Week 5-6: Create First Use Case

1. Extract one workflow (like AutoResolveIssue) into a proper use case
2. Move orchestration logic from workflow to use case
3. Keep existing workflow as adapter for backward compatibility

### Week 7-8: Infrastructure Layer

1. Create repository interfaces
2. Implement one repository (start with simplest)
3. Update use case to use repository interface

## Code Review Checklist

When reviewing PRs, check for:

### ✅ Good Architecture

- [ ] Business logic is in domain entities
- [ ] Use cases orchestrate without containing business rules
- [ ] Infrastructure doesn't contain business logic
- [ ] Dependencies point inward (toward domain)
- [ ] Interfaces are defined in domain/application layers

### ❌ Architecture Violations

- [ ] Business logic in API routes or components
- [ ] Direct database calls from use cases
- [ ] Domain entities depending on external services
- [ ] Infrastructure types leaking into domain

## Migration Status Tracking

Track progress with simple markers in code:

```typescript
// TODO: MIGRATION - Extract to domain entity
// TODO: MIGRATION - Move to use case
// TODO: MIGRATION - Create repository interface
// MIGRATED: This class follows clean architecture
```

## Quick Reference: Where Does This Code Belong?

| Code Type              | Current Location | Target Location                    | Example                   |
| ---------------------- | ---------------- | ---------------------------------- | ------------------------- |
| Business rules         | Various          | `lib/domain/entities/`             | `issue.canBeResolved()`   |
| Workflow orchestration | `lib/workflows/` | `lib/application/usecases/`        | `AutoResolveIssueUseCase` |
| Database queries       | Various          | `lib/infrastructure/repositories/` | `Neo4jIssueRepository`    |
| External API calls     | Various          | `lib/infrastructure/clients/`      | `GitHubApiClient`         |
| UI Components          | `components/`    | `components/` (no change)          | React components          |
| API Routes             | `app/api/`       | `app/api/` (simplified)            | Next.js routes            |

## Zod Integration Patterns

When adding Zod validation during migration, follow these layer-specific patterns:

### Domain Layer - Business Rules

```typescript
// ✅ Validate business invariants
const BusinessRuleSchema = z.object({
  title: z
    .string()
    .min(5)
    .refine(
      (title) => !title.toLowerCase().includes("test"),
      "Production issues cannot contain 'test'"
    ),
})
```

### Application Layer - DTOs and Use Cases

```typescript
// ✅ Validate application inputs/outputs
const RequestSchema = z
  .object({
    issueNumber: z.number().int().positive(),
    repoFullName: z.string().regex(/^[^/]+\/[^/]+$/),
  })
  .transform((data) => ({
    ...data,
    repoFullName: data.repoFullName.toLowerCase(),
  }))
```

### Infrastructure Layer - External Data

```typescript
// ✅ Validate external API responses
const GitHubApiSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z
    .string()
    .nullable()
    .transform((val) => val ?? ""),
})
```

### Presentation Layer - User Input

```typescript
// ✅ Validate form data and API requests
export async function POST(request: NextRequest) {
  const body = RequestSchema.parse(await request.json())
  // ...
}
```

See `/docs/guides/zod-in-clean-architecture.md` for complete patterns and examples.

## Getting Help

- Refer to `/docs/guides/clean-architecture-target.md` for the full vision
- Check `/docs/guides/zod-in-clean-architecture.md` for Zod integration patterns
- Ask questions in code reviews about architecture decisions
- When in doubt, start with extracting to the domain layer

Remember: **Progress over perfection**. Small steps toward the target architecture are better than no steps at all.
