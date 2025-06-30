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

The `scripts/start-services.sh` script automatically loads the appropriate environment file based on the `NODE_ENV`:

- Development: `.env.local`
- Production: `.env.production.local`

### Required Environment Variables

#### Neo4j

- `NEO4J_USER`: Neo4j database username
- `NEO4J_PASSWORD`: Neo4j database password

These variables are used both by the application and by Docker Compose to configure the Neo4j container.

## Usage

The main `docker-compose.yml` file includes all service-specific configurations from the `compose/` directory. To start all services:

```bash
./scripts/start-services.sh
```

This script will:

1. Load the appropriate environment variables
2. Start all Docker services
3. Wait for Neo4j to be ready
4. Start Redis if not running

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

For containerized agent workflows, we use a custom base image with pre-installed tools:

### Building the Agent Base Image

```bash
# Build the custom agent image with ripgrep pre-installed
./scripts/build-agent-image.sh
```

The image includes:

- Ubuntu 22.04 base
- ripgrep (for code searching)
- git (for repository operations)
- curl (for HTTP requests)

### Using the Agent Base Image

The image is automatically used by containerized workflows like `commentOnIssue`. It provides:

- Process isolation for agent operations
- Consistent tool environment
- Pre-installed dependencies

Image name: `issue-to-pr/agent-base:latest`

## Neo4j Services

The `compose/` directory contains Docker Compose configurations for Neo4j database services used by the application.
