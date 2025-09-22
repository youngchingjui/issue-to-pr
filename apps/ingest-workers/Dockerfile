# syntax=docker/dockerfile:1.7-labs
# Build stage uses shared worker base for tooling and caching
FROM node:22-alpine AS base
WORKDIR /app

# Install pnpm and tini for proper signal handling
RUN apk add --no-cache tini && npm i -g pnpm

# Copy workspace manifests first for better caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/ingest-workers/package.json apps/ingest-workers/

# Install deps for ingest workers only (and transitive shared workspaces as needed)
RUN pnpm install --frozen-lockfile --filter @issue-to-pr/ingest-workers...

# Copy source
COPY . .

# Build
RUN pnpm --filter @issue-to-pr/ingest-workers build

# Runtime image
FROM node:22-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache tini && npm i -g pnpm

# Copy only production deps for ingest workers
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/ingest-workers/package.json apps/ingest-workers/
RUN pnpm install --frozen-lockfile --prod --filter @issue-to-pr/ingest-workers...

# Copy built artifacts
COPY --from=base /app/apps/ingest-workers/dist ./apps/ingest-workers/dist

ENV NODE_ENV=production
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["pnpm", "--filter", "@issue-to-pr/ingest-workers", "start"]

