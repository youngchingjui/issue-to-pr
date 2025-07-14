# Docker Configuration

This directory contains all Docker-related configurations for the Issue-to-PR application.

## Directory Structure

```
docker/
├── compose/           # Service-specific compose files
│   ├── neo4j.yml     # Neo4j service configuration
│   └── ...           # Other service configurations
└── docker-compose.yml # Main compose file
```

## Environment Variables

The application uses environment variables from `.env.local` (development) or `.env.production.local` (production). These files should never be committed to the repository.

Specify the environment file when starting services:

- Development: `.env.local`
- Production: `.env.production.local`

### Required Environment Variables

#### Neo4j

- `NEO4J_USER`: Neo4j database username
- `NEO4J_PASSWORD`: Neo4j database password

#### Redis

- `REDIS_URL`: Connection string for the Redis container (e.g. `redis://localhost:6379`)

These variables are used both by the application and by Docker Compose to configure the Neo4j container.

## Usage

The main `docker-compose.yml` file includes all service-specific configurations from the `compose/` directory.

To start all services, run the helper script from the repository root:

```bash
./scripts/start-services.sh
```

Set `NODE_ENV=production` or provide an `ENV_FILE` variable to use a different
environment file:

```bash
NODE_ENV=production ./scripts/start-services.sh
# or
ENV_FILE=.env.production.local ./scripts/start-services.sh
```

## Services

### Neo4j

- Port: 7474 (HTTP), 7687 (Bolt)
- Credentials: Configured via environment variables
- Data persistence: Volumes mounted for data, logs, imports, and plugins

### Adding New Services

1. Create a new service configuration file in `compose/`
2. Add any service-specific configurations in `config/`
3. Include the new service file in `docker-compose.yml`
4. Document required environment variables in `.env.example`

## Agent Base Image

For containerized agent workflows, we use a custom base image with pre-installed tools.

However, in the future we may need to consider using different base images for different repositories.
A Python repo might need a Python image, etc.

### Building the Agent Base Image

```bash
# Build the multi-architecture agent image with ripgrep, Node.js 22, and pnpm pre-installed
./scripts/build-agent-image.sh
```

> **Prerequisite**  
> This script expects a Docker _Buildx_ builder named `container-builder` that uses the `docker-container` driver.  
> Create and activate it (only once per machine) with:
>
> ```bash
> # Verify that Docker Buildx is available
> docker buildx version
>
> # Create and switch to the required builder
> docker buildx create --name container-builder --driver docker-container --use
> ```
>
> If you already have a suitable builder configured you can skip this step.

The script uses **docker buildx** to build and push images for both `linux/amd64` and
`linux/arm64` platforms.

The image includes:

- Ubuntu 22.04 base
- ripgrep (for code searching)
- git (for repository operations)
- curl (for HTTP requests)
- Node.js v22 (with npm)
- pnpm (Node.js alternative package manager)

### Using the Agent Base Image

The image is automatically used by containerized workflows like `commentOnIssue`. It provides:

- Process isolation for agent operations
- Consistent tool environment
- Pre-installed dependencies

Image name: `ghcr.io/youngchingjui/agent-base:latest`

This is a private image, so you need to login with Docker to pull this image.

## Neo4j Services

The `compose/` directory contains Docker Compose configurations for Neo4j database services used by the application.
