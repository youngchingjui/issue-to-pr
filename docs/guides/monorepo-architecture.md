# Monorepo Architecture Guide

## Overview

This project has been restructured as a monorepo to support separate services that can be deployed independently. This architecture provides better scalability, reliability, and separation of concerns.

## Structure

```
issue-to-pr/
├── app/                    # Next.js application
├── services/               # Separate services
│   ├── worker/            # Background worker service
│   │   ├── src/
│   │   │   ├── index.ts   # Worker entry point
│   │   │   ├── jobs/      # Job handlers
│   │   │   ├── queues/    # Queue definitions
│   │   │   └── utils/     # Worker-specific utilities
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   └── shared/            # Shared libraries
│       ├── src/
│       │   ├── types/     # Common types
│       │   ├── schemas/   # Zod schemas
│       │   ├── db/        # Database clients
│       │   └── github/    # GitHub API utilities
│       ├── package.json
│       └── tsconfig.json
├── docker/                # Docker configuration
└── pnpm-workspace.yaml   # Workspace configuration
```

## Services

### Next.js Application (Web App)

- Handles HTTP requests and UI
- Enqueues background jobs
- Serves the web interface
- Uses shared library for types and schemas

### Worker Service

- Processes background jobs from Redis queues
- Runs independently from the web app
- Handles long-running workflows like resolveIssue, commentOnIssue
- Can be scaled horizontally

### Shared Library

- Common types and schemas
- Database connection utilities
- GitHub API types
- Queue job data definitions

## Queue System

The system uses **BullMQ** with Redis for job queuing:

### Queues:

- `resolve-issue`: Handles issue resolution workflows
- `comment-on-issue`: Generates and posts comments on issues
- `auto-resolve-issue`: Automated issue resolution

### Job Flow:

1. Next.js API routes receive requests
2. Jobs are enqueued with validation
3. Worker processes jobs independently
4. Results are stored in Neo4j
5. Status updates via Redis streams

## Development

### Prerequisites

- Node.js 20+
- pnpm
- Docker & Docker Compose

### Setup

```bash
# Install dependencies
pnpm install

# Build shared library
pnpm --filter shared build

# Build worker
pnpm --filter worker build

# Start services
docker compose -f docker/docker-compose.yml up -d
```

### Available Scripts

```bash
# Next.js app
pnpm dev                 # Start development server
pnpm build              # Build for production

# Worker service
pnpm dev:worker         # Start worker in development
pnpm start:worker       # Start worker in production

# Shared library
pnpm build:shared       # Build shared library
pnpm dev:shared         # Watch and build shared library

# All services
pnpm build:all          # Build all packages
```

## Deployment

### Docker Compose

The project includes a multi-service Docker setup:

```bash
# Start all services
docker compose -f docker/docker-compose.yml up -d

# View service status
docker compose -f docker/docker-compose.yml ps

# View logs
docker compose -f docker/docker-compose.yml logs worker
```

### Services Configuration

#### Worker Service

- **Concurrency**: Configurable per queue type
  - resolve-issue: 2 concurrent jobs
  - comment-on-issue: 3 concurrent jobs
  - auto-resolve-issue: 1 concurrent job
- **Health checks**: Built-in health monitoring
- **Auto-restart**: Configured for high availability

#### Redis

- Used for job queues and caching
- Persistent data volumes
- Health checks included

#### Neo4j

- Stores workflow data and events
- Persistent volumes for data
- Health monitoring

## Benefits

### Scalability

- Worker can be scaled independently
- Multiple worker instances can run simultaneously
- Queue-based processing handles load spikes

### Reliability

- Web app crashes don't affect background jobs
- Jobs are persisted in Redis
- Automatic retry mechanisms
- Graceful shutdown handling

### Development Experience

- Shared types ensure consistency
- Hot reloading for both services
- Independent testing and deployment
- Clear separation of concerns

## Migration from Previous Architecture

### What Changed

1. **Background jobs moved to worker service**

   - No longer run directly in API routes
   - Jobs are enqueued instead of executed immediately

2. **Shared library created**

   - Common types and utilities
   - Prevents code duplication

3. **Docker Compose updated**
   - Worker service added
   - Network configuration improved

### API Compatibility

The API routes remain the same, but now:

- Return job IDs immediately
- Jobs execute asynchronously in worker
- Status can be monitored via existing SSE endpoints

## Troubleshooting

### Worker Not Starting

1. Check Redis connection
2. Verify environment variables
3. Check Docker logs: `docker compose logs worker`

### Jobs Not Processing

1. Verify worker is running: `docker compose ps`
2. Check queue status in Redis
3. Monitor worker logs for errors

### Performance Issues

1. Adjust worker concurrency settings
2. Scale worker horizontally
3. Monitor Redis memory usage
4. Check Neo4j query performance

## Environment Variables

### Required for Worker

```bash
REDIS_URL=redis://redis:6379
NEO4J_URI=bolt://neo4j:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
OPENAI_API_KEY=your_openai_key
GITHUB_APP_ID=your_github_app_id
GITHUB_APP_PRIVATE_KEY_PATH=/path/to/your/github-private-key.pem
```

### Development vs Production

- Development: Uses local Redis/Neo4j
- Production: Should use managed services (Upstash Redis, Neo4j Aura)
