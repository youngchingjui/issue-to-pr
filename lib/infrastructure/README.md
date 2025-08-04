# Infrastructure Layer

This layer contains implementations of external dependencies and technical concerns.

## Structure

- `repositories/` - Repository implementations (Neo4j, GitHub API, etc.)
- `clients/` - External service clients (OpenAI, GitHub, Docker)
- `database/` - Database-specific code and migrations

## Rules

1. **Implement interfaces** - Implement repository interfaces defined in domain layer
2. **External dependencies** - Handle all external service communication
3. **Technical details** - Database schemas, API clients, file system operations
4. **Framework-specific** - Can use any frameworks or libraries needed

## Examples

```typescript
// repositories/Neo4jIssueRepository.ts
export class Neo4jIssueRepository implements IIssueRepository {
  async getByNumber(issueNumber: number, repoFullName: string): Promise<Issue> {
    // Neo4j-specific implementation
  }
}

// clients/GitHubApiClient.ts
export class GitHubApiClient {
  async getIssue(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<GitHubIssue> {
    // GitHub API implementation
  }
}
```

## Migration Notes

During migration, existing code from these locations will be moved here:

- `lib/tools/` → `lib/infrastructure/tools/`
- `lib/neo4j/` → `lib/infrastructure/database/neo4j/`
- `lib/github/` → `lib/infrastructure/clients/github/`

See `/docs/guides/clean-architecture-target.md` for full details.
