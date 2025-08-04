# Services

This directory contains the separate services that make up the issue-to-pr application.

## Structure

- **`worker/`** - Background job processing service using BullMQ

## Getting Started

### Development

```bash
# From project root
pnpm install
pnpm dev:worker
```

### Production

```bash
# Build all services
pnpm build:all

# Or use Docker
docker compose -f ../docker/docker-compose.yml up -d
```

## Service Details

### Worker Service (`worker/`)

Processes background jobs from Redis queues:

- Handles long-running workflows
- Processes issue resolution, comment generation, etc.
- Runs independently from the web application
- Can be scaled horizontally

## Adding New Services

To add a new service:

1. Create a new directory under `services/`
2. Add `package.json` with workspace dependency on `shared`
3. Update `pnpm-workspace.yaml` if needed
4. Add Docker configuration if deployable
5. Update the main `docker-compose.yml`

Example `package.json`:

```json
{
  "name": "your-service",
  "dependencies": {
    "shared": "workspace:*"
  }
}
```
