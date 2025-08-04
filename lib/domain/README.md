# Domain Layer

This layer contains the core business logic and entities for the Issue-to-PR application.

## Structure

- `entities/` - Core business entities (Issue, Repository, WorkflowRun, etc.)
- `services/` - Domain services for complex business operations
- `repositories/` - Repository interfaces (implementations live in infrastructure)

## Rules

1. **No external dependencies** - This layer should only depend on standard TypeScript/JavaScript
2. **Pure business logic** - No framework-specific code, database queries, or API calls
3. **Interface definitions** - Define repository interfaces here, implement them in infrastructure
4. **Behavior-focused** - Entities should have methods that represent business operations

## Examples

```typescript
// entities/Issue.ts
export class Issue {
  canBeAutoResolved(): boolean {
    return this.state === IssueState.Open && this.hasValidDescription()
  }
}

// repositories/IIssueRepository.ts (interface only)
export interface IIssueRepository {
  getByNumber(issueNumber: number, repoFullName: string): Promise<Issue>
}
```

See `/docs/guides/clean-architecture-target.md` for full details.
