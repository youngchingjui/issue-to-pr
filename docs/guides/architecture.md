# Architecture Overview

## Table of Contents

1. [Code Structure](#code-structure)
2. [Key Technologies](#key-technologies)
3. [Infrastructure Components](#infrastructure-components)
4. [Related Documentation](#related-documentation)

## Code Structure

For a detailed overview of the project's directory structure and organization, please refer to [`/docs/code-structure.md`](../code-structure.md).

## Key Technologies

### Frontend

- Next.js 14 (App Router)
- TailwindCSS for styling
- Shadcn/ui components
- Server-Sent Events (SSE) for real-time updates

### Backend

- Next.js API routes
- Octokit for GitHub API integration
- OpenAI API for code generation
- Redis for state management and event streaming

### Authentication

- NextAuth.js with dual GitHub providers
- Redis-based token management
- GitHub App integration

## Infrastructure Components

### Redis Infrastructure

- Production: Upstash Redis
- Development: Local Redis instance
- Key functionalities:
  - Token management and refresh
  - Event streaming
  - Job status tracking
  - Workflow coordination

### AI Infrastructure

- OpenAI API integration
- Multiple specialized AI agents
- Langfuse for observability
- Real-time streaming responses

### GitHub Integration

- Dual authentication support (OAuth & App)
- Enhanced API access management
- Automated PR workflows
- Webhook integration

## Related Documentation

- [Authentication Details](authentication.md)
- [AI Integration](ai-integration.md)
- [Database Architecture](database-architecture.md)
- [Streaming Architecture](streaming-architecture.md)
- [API Documentation](../api/README.md)
- [Development Plan](development-plan.md)

For setup instructions, see:

- [Getting Started Guide](../setup/getting-started.md)
- [Contributing Guide](contributing.md)
