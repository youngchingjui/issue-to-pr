# issue-to-pr

... (existing README content above) ...

## Local Development Startup

### Prerequisites
- Docker
- Docker Compose
- Redis (`redis-server` CLI in PATH)
- Node.js (v14+)
- pnpm

### To start all backend services:

- Environment variables from `.env.local` (development) or `.env.production.local` (production) are loaded automatically.
- All required services (Neo4j, Redis if not already running, etc) will be launched automatically.

```
pnpm dev
```

This launches a cross-platform Node.js service orchestrator (`scripts/start-services.js`) that:
- Loads env from your .env file
- Runs Docker Compose for Neo4j and other containers
- Waits for Neo4j
- Checks for a local Redis instance and starts it if not running
- Verifies Redis is responding

You may override environment variables as normal. You may also choose to run your own Redis instance before starting, or let the orchestrator start it for you.

For more, see [`docs/setup/getting-started.md`](docs/setup/getting-started.md).
