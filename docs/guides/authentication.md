# Authentication Guide

## Table of Contents

1. [Overview](#overview)
2. [Authentication Methods](#authentication-methods)
3. [Token Management](#token-management)
4. [Configuration](#configuration)

## Overview

The application supports two authentication methods for GitHub integration:

- Traditional OAuth for public repository access
- GitHub App installation for enhanced repository access

## Authentication Methods

### OAuth Authentication

- Used for public repository access
- Provides user-level permissions
- Configuration:

```typescript
GithubProvider({
  id: "github-oauth",
  name: "GitHub OAuth",
  clientId: process.env.GITHUB_OAUTH_ID,
  clientSecret: process.env.GITHUB_OAUTH_SECRET,
  authorization: {
    params: {
      scope: "read:user user:email repo workflow",
    },
  },
})
```

Required Permissions: `read:user`, `user:email`, `repo`, `workflow`

> **Note**: After this scope change, existing users will need to re-authorize the app in GitHub to grant the new `workflow` permission. Without re-authorization, the application may not be able to perform actions on workflow files for previously authorized users.

### GitHub App Authentication

- Used for installed repositories
- Provides installation-level permissions
- Enhanced API rate limits
- Configuration:

```typescript
GithubProvider({
  id: "github-app",
  name: "GitHub App",
  clientId: process.env.GITHUB_APP_CLIENT_ID,
  clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
  // Additional GitHub App configuration
})
```

## Token Management

### Redis Token Storage

- Tokens stored in Redis with expiration
- Automatic token refresh mechanism
- Concurrent refresh prevention using locks
- Key naming convention:
  - `token_${userId}` - User tokens
  - `token_refresh_lock_${userId}` - Refresh locks

### Token Refresh Process

1. Check token expiration
2. Attempt to acquire Redis lock
3. Verify if token already refreshed
4. Perform refresh if needed
5. Update Redis cache
6. Release lock

## Configuration

### Environment Variables

```env
# OAuth Configuration
GITHUB_OAUTH_ID=your_oauth_client_id
GITHUB_OAUTH_SECRET=your_oauth_client_secret

# GitHub App Configuration
GITHUB_APP_ID=your_app_id
GITHUB_APP_CLIENT_ID=your_app_client_id
GITHUB_APP_CLIENT_SECRET=your_app_client_secret
GITHUB_APP_PRIVATE_KEY=your_private_key

# Redis Configuration
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### NextAuth Configuration

- Session strategy: JWT
- Callbacks for token and session management
- Custom session types for TypeScript support

For more information about:

- API endpoints, see [Auth API Documentation](../api/auth.md)
- Redis setup, see [Redis Setup Guide](../setup/redis-setup.md)

## Related Documentation

- [API Authentication](../api/auth.md)
- [Redis Setup](../setup/redis-setup.md)
- [Environment Configuration](../setup/getting-started.md#configuration)
- [Architecture Overview](architecture.md)

For implementation details, see:

- [GitHub Integration](github-integration.md)
- [Database Schema](database-architecture.md#authentication-schema)
