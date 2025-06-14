# Getting Started

... (original content above preserved) ...

## Development

1. Start Redis server (unless you want our orchestrator to manage it automatically):
   
   macOS:
   ```bash
   brew update
   brew install redis
   redis-server
   ```
   Ubuntu:
   ```bash
   sudo apt update
   sudo apt install redis-server
   redis-server
   ```
   Windows:
   Use WSL or download from [Microsoft's Redis](https://github.com/microsoftarchive/redis/releases) and run `redis-server` from the installed directory.

   **OR:** Let the orchestrator (`scripts/start-services.js`) auto-start Redis if not found.

2. Start the development environment, which will automatically boot everything else (`pnpm dev`):
   
   ```bash
   pnpm install
   pnpm dev
   ```
   - This will launch the cross-platform Node.js startup script instead of the legacy shell script.
   - The script loads environment variables from `.env.local` or `.env.production.local`.
   - Starts Docker Compose (Neo4j, and any other containers as defined in `docker/docker-compose.yml`).
   - Waits for Neo4j service.
   - Ensures Redis is running and ready (starts one locally if not).
   - If anything fails, process exits with a log message.

For further service and architecture details, see:
- [docker/README.md](../../docker/README.md)
- [docs/guides/architecture.md](../guides/architecture.md)
