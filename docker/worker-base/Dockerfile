# syntax=docker/dockerfile:1.7-labs
# Minimal base for Node workers with pnpm and tini (graceful signal handling)
FROM node:22-alpine
RUN apk add --no-cache tini && npm i -g pnpm
WORKDIR /app
ENTRYPOINT ["/sbin/tini", "--"]

