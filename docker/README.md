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

For containerized agent workflows, we use custom base images with pre-installed tools.

### Node.js-based Agent Base Image

For most JavaScript/TypeScript projects, use the Node.js 22 image:

#### Building the Node Agent Image

```bash
# Build the multi-architecture agent image with ripgrep, Node.js 22, and pnpm pre-installed
./scripts/build-agent-image.sh
```

- **Image name:** `ghcr.io/youngchingjui/agent-base:latest` (or `:node22-*` tags)

#### Included tools
- Ubuntu 22.04 base
- ripgrep (for code searching)
- git (for repository operations)
- curl (for HTTP requests)
- Node.js v22 (with npm)
- pnpm (alternative package manager)

### Python 3.11-based Agent Base Image

For Python projects, use the Python 3.11 agent image:

#### Building the Python Agent Image

```bash
# Use the --python flag (recommended tag is python3.11-latest)
./scripts/build-agent-image.sh --python python3.11-latest

# Or with multiple tags
./scripts/build-agent-image.sh --python python3.11-1.0.0 python3.11-latest

# Or with explicit Dockerfile path if customized
./scripts/build-agent-image.sh --dockerfile=docker/agent-base/Dockerfile.python my-custom-tag
```

- **Image name:** `ghcr.io/youngchingjui/agent-base:python3.11-latest`

#### Included tools
- Debian (slim) base
- ripgrep (for code searching)
- git (for repository operations)
- curl (for HTTP requests)
- Python 3.11 (with pip)
- Poetry (Python project/package manager)

#### Notes
- Both base images are multi-arch (`linux/amd64,linux/arm64`).
- The build script'\''s `--python` flag switches to the Python image and recommended tags.
- You can override the image name with the `AGENT_BASE_IMAGE` env var.

### Prerequisites (for agent images)

> **Docker Buildx** 
> The scripts expect a Docker _Buildx_ builder named `container-builder` (driver: `docker-container`).
>
> ```bash
> # Verify Docker Buildx
> docker buildx version
>
> # Create/use the required builder (once per machine)
> docker buildx create --name container-builder --driver docker-container --use
> ```

### How the Images Are Used

These images are used by containerized workflows, enabling:
- Process isolation for agent operations
- Consistent tool environment
- Pre-installed dependencies for speed and reliability

---

Image builds will prompt for credentials when pushing to private registries. For public agent workflows with only Node tools, use the `node22-latest` tag.

## Neo4j Services

The `compose/` directory contains Docker Compose configurations for Neo4j database services used by the application.
