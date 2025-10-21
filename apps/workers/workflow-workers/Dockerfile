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

# Copy source
COPY tsconfig.base.json ./
COPY apps/workers/workflow-workers/ ./apps/workers/workflow-workers/
COPY shared/ ./shared/

# Install and build shared package first
RUN pnpm install --frozen-lockfile --filter shared...
RUN pnpm --filter shared... build

# Then install and build the workflow worker, which relies on the shared package
RUN pnpm install --frozen-lockfile --filter workflow-workers...
RUN pnpm --filter workflow-workers... build

# Finally, deploy the workflow worker
RUN pnpm --filter workflow-workers deploy --prod /app/workflow-workers-deploy

# Production stage
FROM node:22-alpine AS production
WORKDIR /app

# Enable Corepack (not strictly needed at runtime since we copy a pruned deploy)
RUN corepack enable && corepack prepare pnpm@10.6.4 --activate

# Add required CLIs for host-side operations run by the worker
# - git: required for setupLocalRepository clone/fetch operations
# - bash: sometimes used by scripts
# - openssh-client, ca-certificates: robust HTTPS/SSH git operations
# - ripgrep, tree: optional but handy if you ever run checks on host
RUN apk add --no-cache \
  git \
  bash \
  openssh-client \
  ca-certificates \
  ripgrep \
  tree

# Copy the prepared deploy (includes node_modules and built dist)
COPY --from=builder /app/workflow-workers-deploy/ /app/

ENV NODE_ENV=production
# Send SIGTERM and allow time to shutdown gracefully
STOPSIGNAL SIGTERM
# Start directly with node; no pnpm needed at runtime
CMD ["node", "dist/index.js"]

