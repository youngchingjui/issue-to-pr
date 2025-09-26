# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Enable Corepack and activate the pinned pnpm version from packageManager
RUN corepack enable && corepack prepare pnpm@10.6.4 --activate

# Copy workspace manifests first for better caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/workers/workflow-workers/package.json apps/workers/workflow-workers/
# Ensure the shared workspace exists for pnpm’s resolver
COPY shared/package.json shared/

# Enable inject-workspace-packages for the workflow worker
# Otherwise, shared dependencies are only symlinked and not included in the final bundle
# This setting is NOT carried over from host, so must be set here.
RUN pnpm config set inject-workspace-packages true

# Install deps only for the workflow worker (and its transitive deps)
RUN pnpm install --frozen-lockfile --filter @issue-to-pr/workflow-workers...

# Copy source
COPY tsconfig.base.json ./
COPY apps/workers/workflow-workers/ ./apps/workers/workflow-workers/
COPY shared/ ./shared/

# Build and prepare a production-ready deployable package for the workflow worker
RUN pnpm --filter @issue-to-pr/workflow-workers... build \
  && pnpm --filter @issue-to-pr/workflow-workers deploy --prod /app/workflow-workers-deploy

# Production stage
FROM node:22-alpine AS production
WORKDIR /app

# Enable Corepack (not strictly needed at runtime since we copy a pruned deploy)
RUN corepack enable && corepack prepare pnpm@10.6.4 --activate

# Copy the prepared deploy (includes node_modules and built dist)
COPY --from=builder /app/workflow-workers-deploy/ /app/

ENV NODE_ENV=production
# Send SIGTERM and allow time to shutdown gracefully
STOPSIGNAL SIGTERM
# Start directly with node; no pnpm needed at runtime
CMD ["node", "dist/index.js"]

