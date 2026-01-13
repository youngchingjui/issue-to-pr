# GitHub Webhook Fixtures

This directory contains realistic GitHub webhook payload fixtures for testing webhook handlers and routes.

## Usage

Import the fixtures in your tests:

```typescript
import { webhookFixtures } from "@/__tests__/fixtures/github/webhooks"

// Use in tests
const payload = webhookFixtures.issues.labeled.resolve
```

## Available Fixtures

### Issues Events
- `webhookFixtures.issues.labeled.resolve` - Issue labeled with "resolve"
- `webhookFixtures.issues.labeled.autoResolve` - Issue labeled with "i2pr: resolve issue"

### Pull Request Events
- `webhookFixtures.pullRequest.labeled` - PR labeled with "i2pr: update pr"
- `webhookFixtures.pullRequest.closed.merged` - PR closed and merged

### Issue Comment Events
- `webhookFixtures.issueComment.created.pr` - Comment created on a PR by an OWNER

### Installation Events
- `webhookFixtures.installation.created` - GitHub App installation created
- `webhookFixtures.installationRepositories.added` - Repositories added to installation

### Repository Events
- `webhookFixtures.repository.edited` - Repository settings edited

## Fixture Structure

Each fixture contains realistic GitHub webhook payload data including:
- Complete repository information
- Issue/PR details with realistic metadata
- User/sender information
- Installation context
- Proper timestamps and IDs

These fixtures are designed to:
1. Test webhook route parsing and validation
2. Test handler business logic with realistic data
3. Ensure TypeScript type safety
4. Provide consistent test data across the codebase
