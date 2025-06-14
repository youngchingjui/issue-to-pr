# Docker Services for issue-to-pr

## Environment Variables
The application uses environment variables from `.env.local` (development) or `.env.production.local` (production). These files should never be committed to the repository.

**As of 2024-06, the legacy `scripts/start-services.sh` is replaced by the cross-platform Node.js script `scripts/start-services.js`, which is called automatically by `pnpm dev` or `npm run dev`.**

To start all backend services manually:

```
pnpm run predev  # or node scripts/start-services.js
```

Or start the dev server, which will also start services as a prerequisite:
```
pnpm dev
```

## Usage

The main `docker-compose.yml` file includes all service-specific configurations from the `compose/` directory. To start all services manually:

```
docker-compose -f docker/docker-compose.yml up -d
```

You should ensure environment variables in `.env.local` are set appropriately.

## Important
- Redis can be either managed by Docker Compose or run as a native process by the orchestrator. 
- The new orchestrator stops if Neo4j or Redis do not become available.

## Extending
1. Create a new service configuration file in `compose/`
2. Add any service-specific configurations in `config/`
3. Include the new service file in `docker-compose.yml`
4. Document required environment variables in `.env.example`
