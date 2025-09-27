Ingest Workers

Purpose

- Consume events from a Redis Stream (Redis Streams consumer groups) and persist to Neo4j.
- Provide a scalable worker group that can be increased/decreased via `docker compose up --scale ingest=3`.

Environment

- REDIS_URL: Redis connection string (e.g., redis://redis:6379)
- NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD: Neo4j connection
- INGEST_STREAM_KEY: Redis Stream key to read from (default: workflow:events:ingest)
- INGEST_GROUP: Consumer group name (default: ingest)
- INGEST_CONSUMER: Consumer name (default: random)
- INGEST_BLOCK_MS: XREADGROUP block timeout (default: 5000)
- INGEST_BATCH_SIZE: Messages per read (default: 1)

Usage

- Build and run (single instance):
  - `docker compose -f docker/docker-compose.yml up -d ingest`
- Scale up:
  - `docker compose -f docker/docker-compose.yml up -d --scale ingest=3`
- Tip: the compose service config sets `stop_signal: SIGTERM` and `stop_grace_period: 30s` to allow a clean drain.

Graceful shutdown

- On SIGTERM/SIGINT, the worker stops fetching new messages, completes the current one, acknowledges it, and exits cleanly. On startup it also attempts to reclaim stale pending messages.

Notes

- This lays the foundation. Mapping of all event variants is TODO; currently status, workflow.error, and workflow.state are persisted.

