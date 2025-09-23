Workers (BullMQ)

This package hosts BullMQ-based workers used for long-running workflows.

Placeholders

- Additional worker groups can be created under apps/\* and reuse the shared docker/worker-base image and docker-compose includes. See apps/ingest-workers for a Redis Streams-based group foundation.
