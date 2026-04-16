# Getting Started

## Table of Contents

- [Getting Started](#getting-started)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Development](#development)
  - [Next Steps](#next-steps)

## Prerequisites

Before you begin, ensure you have:

- Node.js (version 18 or later)
- pnpm (required)
- Docker and Docker Compose (required for local databases)
- GitHub account
- OpenAI API key (optional for development)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd <repository-directory>
```

2. Install pnpm (if not installed):

```bash
npm install -g pnpm
```

3. Install dependencies:

```bash
pnpm install
```

## Configuration

1. Prepare Docker Compose environment variables used for local databases:

Ensure `docker/.env` exists and has values. If the file doesn't exist, create it with at least:

```env
# docker/.env
NEO4J_USER=neo4j
NEO4J_PASSWORD=letmein
```

2. Create `.env.local` for app secrets used by Next.js (if applicable):

```env
# Example (fill with your own values where needed)
# GitHub OAuth (optional for local dev)
GITHUB_OAUTH_ID=your_oauth_client_id
GITHUB_OAUTH_SECRET=your_oauth_client_secret

# OpenAI (optional for development)
OPENAI_API_KEY=your_openai_key

# Redis URL for local dev (Docker exposes Redis on host:6379 by default)
REDIS_URL=redis://localhost:6379
```

## Development

1. Start required services (Neo4j, Redis) using Docker Compose from the repository root:

```bash
docker compose -f docker/docker-compose.yml up -d
```

This launches all required services and uses healthchecks so they only report "healthy" when ready.

2. Start the development server:

```bash
pnpm dev
```

3. Open the application:

- Navigate to http://localhost:3000
- Sign in with GitHub
- Start using the application

## Next Steps

- [Authentication Setup](../guides/authentication.md)
- [AI Integration](../guides/ai-integration.md)
- [Architecture Overview](../guides/architecture.md)
