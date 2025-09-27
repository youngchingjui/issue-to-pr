# syntax=docker/dockerfile:1.7-labs
# Build stage uses shared worker base for tooling and caching
FROM node:22-alpine AS base
WORKDIR /app

# Install tini and enable Corepack for pinned pnpm from packageManager
RUN apk add --no-cache tini && corepack enable

# Copy full repo (ensures workspace deps are present)
COPY . .

# Install deps for ingest workers only (and transitive shared workspaces as needed)
RUN pnpm install --frozen-lockfile --filter @issue-to-pr/ingest-workers...

# Build
RUN pnpm --filter @issue-to-pr/ingest-workers build

# Runtime image
FROM node:22-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache tini

# Copy only production deps manifest and install filtered prod deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/ingest-workers/package.json apps/ingest-workers/
RUN corepack enable && pnpm install --frozen-lockfile --prod --filter @issue-to-pr/ingest-workers...

# Copy built artifacts
COPY --from=base /app/apps/ingest-workers/dist ./apps/ingest-workers/dist

ENV NODE_ENV=production
# Run as non-root for security
RUN addgroup -S nodejs && adduser -S node -G nodejs && chown -R node:nodejs /app
USER node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/ingest-workers/dist/index.js"]

