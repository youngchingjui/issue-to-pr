# Docker Configuration

This directory contains all Docker-related configurations for the Issue-to-PR application.

## Directory Structure

```
docker/
├── compose/           # Service-specific compose files
│   ├── neo4j.yml      # Neo4j service configuration
│   ├── redis.yml      # Redis service configuration
│   └── ...            # Other service configurations
└── docker-compose.yml # Main compose file
```

## Environment Variables

Docker Compose in this folder reads variables from `docker/.env`. Ensure this file exists and has the right values, for example:

```
# docker/.env
NEO4J_USER=neo4j
NEO4J_PASSWORD=letmein
```

## Usage

The main `docker-compose.yml` file includes all service-specific configurations from the `compose/` directory. To start or stop all services from the repository root:

```bash
docker compose -f docker/docker-compose.yml up -d --wait
# ... do your work ...
docker compose -f docker/docker-compose.yml down
```

You no longer use the `start-services.sh` script—simply run Compose directly.

This workflow will:

1. Start all database services (including Redis and Neo4j) in the background
2. Block until each service passes its healthcheck (the `--wait` flag tells Compose to wait for healthy status)

## Services

### Neo4j
- Port: 7474 (HTTP), 7687 (Bolt)
- Credentials: Configured via environment variables
- Data persistence: Volumes mounted for data, logs, imports, and plugins

### Redis
- Port: 6379
- Data persistence: Local Docker volume

### Adding New Services
1. Create a new service configuration file in `compose/`
2. Include the new service file in `docker-compose.yml`
3. Document additional variables in your `.env`
