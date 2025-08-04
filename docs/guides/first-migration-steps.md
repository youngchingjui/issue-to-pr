# First Migration Steps

This document provides a concrete action plan for the first phase of migrating to clean architecture.

## Phase 1: Foundation (Week 1-2) ✅

- [x] Create folder structure
- [x] Create documentation
- [x] Create templates for reference
- [ ] Team review and alignment

## Phase 2: Extract First Domain Entity (Week 3-4)

### Step 1: Create Issue Entity

Based on the current `GitHubIssue` type, create a proper domain entity:

```bash
# 1. Create the real Issue entity
cp lib/domain/entities/Issue.template.ts lib/domain/entities/Issue.ts
# Edit to match current GitHubIssue interface

# 2. Create repository interface
cp lib/domain/repositories/IIssueRepository.template.ts lib/domain/repositories/IIssueRepository.ts
```

### Step 2: Update One Component

Pick one simple component that uses issues and update it to use the new domain entity:

**Target**: `components/issues/IssueRow.tsx`

- Update imports to use new `Issue` entity
- Use entity methods instead of direct property access
- Keep backward compatibility with existing props

### Step 3: Create Adapter

Create an adapter to convert between old and new types during transition:

```typescript
// lib/shared/adapters/IssueAdapter.ts
export class IssueAdapter {
  static fromGitHubIssue(gitHubIssue: GitHubIssue): Issue {
    return new Issue(
      gitHubIssue.number,
      gitHubIssue.title,
      gitHubIssue.body
      // ... map all properties
    )
  }

  static toGitHubIssue(issue: Issue): GitHubIssue {
    // Convert back for backward compatibility
  }
}
```

## Phase 3: Create First Use Case (Week 5-6)

### Step 1: Extract AutoResolveIssue Use Case

1. Create use case from template:

```bash
cp lib/application/usecases/AutoResolveIssueUseCase.template.ts lib/application/usecases/AutoResolveIssueUseCase.ts
cp lib/application/dtos/AutoResolveIssue.template.ts lib/application/dtos/AutoResolveIssue.ts
```

2. Move orchestration logic from `lib/workflows/autoResolveIssue.ts` to the use case
3. Keep existing workflow as a thin adapter that calls the use case

### Step 2: Update API Route

Simplify the API route to use the new use case:

```typescript
// app/api/workflow/autoResolveIssue/route.ts (simplified)
export async function POST(request: NextRequest) {
  const useCase = new AutoResolveIssueUseCase(/* dependencies */)

  try {
    const result = await useCase.execute(await request.json())
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

## Phase 4: Infrastructure Setup (Week 7-8)

### Step 1: Create Repository Implementation

```bash
mkdir -p lib/infrastructure/repositories
touch lib/infrastructure/repositories/Neo4jIssueRepository.ts
```

Implement the `IIssueRepository` interface using existing Neo4j code.

### Step 2: Dependency Injection Setup

Create a simple DI container:

```typescript
// lib/shared/container.ts
export class Container {
  private services = new Map()

  register<T>(name: string, factory: () => T): void {
    this.services.set(name, factory)
  }

  get<T>(name: string): T {
    const factory = this.services.get(name)
    if (!factory) throw new Error(`Service ${name} not registered`)
    return factory()
  }
}

// Configure services
const container = new Container()
container.register("IssueRepository", () => new Neo4jIssueRepository())
container.register(
  "AutoResolveUseCase",
  () =>
    new AutoResolveIssueUseCase(
      container.get("IssueRepository")
      // ... other dependencies
    )
)
```

## Migration Checklist for Each PR

When working on any feature that touches issues or workflows:

### Before Starting

- [ ] Read current code to understand what layer it should belong to
- [ ] Check if domain entities need to be extracted
- [ ] Identify if new use cases are needed

### During Development

- [ ] Put business logic in domain entities
- [ ] Put orchestration in use cases
- [ ] Keep components focused on UI only
- [ ] Use repository interfaces, not direct database access

### Before Submitting PR

- [ ] Business logic is in domain layer
- [ ] Use cases orchestrate without containing business rules
- [ ] Infrastructure code doesn't leak into higher layers
- [ ] Added tests at appropriate layers
- [ ] Updated migration status in code comments

## Quick Wins for Each Developer

### When Adding New Features

1. **Start with domain** - Define the entity and business rules first
2. **Create use case** - Handle orchestration at application layer
3. **Simple UI** - Keep components focused on presentation

### When Fixing Bugs

1. **Find the layer** - Where does this bug actually belong?
2. **Extract if needed** - Move business logic to appropriate layer
3. **Add tests** - Prevent regression at the right layer

### When Refactoring

1. **Extract entities** - Turn data structures into behavior-rich entities
2. **Simplify components** - Remove business logic from UI
3. **Use interfaces** - Abstract away infrastructure details

## Success Metrics

Track progress with these simple metrics:

- **Lines of business logic in domain layer** (increasing = good)
- **Number of direct database calls in components** (decreasing = good)
- **Number of use cases implemented** (increasing = good)
- **Test coverage by layer** (should be highest in domain)

## Getting Unstuck

Common issues and solutions:

**"Where does this code belong?"**

- If it's a business rule → Domain entity
- If it orchestrates multiple operations → Use case
- If it calls external services → Infrastructure
- If it's UI logic → Component

**"This seems like too much work"**

- Start small - extract one entity or use case
- Keep existing code working with adapters
- Make incremental improvements

**"How do I handle dependencies?"**

- Use interfaces defined in domain/application layers
- Implement concrete classes in infrastructure
- Use simple dependency injection

Remember: **Every small step toward clean architecture is progress!**
