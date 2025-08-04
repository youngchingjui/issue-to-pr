# Application Layer

This layer contains use cases and application-specific business rules.

## Structure

- `usecases/` - Application use cases that orchestrate domain objects
- `services/` - Application services for cross-cutting concerns
- `dtos/` - Data Transfer Objects for communication between layers

## Rules

1. **Orchestration only** - Use cases coordinate domain objects but don't contain business rules
2. **Depend on domain** - Can use domain entities and repository interfaces
3. **Define DTOs** - Create request/response objects for communication with presentation layer
4. **Handle transactions** - Manage database transactions and events at this level

## Examples

```typescript
// usecases/AutoResolveIssueUseCase.ts
export class AutoResolveIssueUseCase {
  async execute(
    request: AutoResolveIssueRequest
  ): Promise<AutoResolveIssueResponse> {
    // Orchestrate domain services and repositories
  }
}

// dtos/AutoResolveIssueRequest.ts
export interface AutoResolveIssueRequest {
  issueNumber: number
  repoFullName: string
  jobId: string
}
```

See `/docs/guides/clean-architecture-target.md` for full details.
