# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace manifests first for better caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/workers/workflow-workers/package.json apps/workers/workflow-workers/

# Install deps only for the workflow worker (and its transitive deps)
RUN pnpm install --frozen-lockfile --filter @issue-to-pr/workflow-workers...

# Copy source
# TODO: Investigate NOT copying the NextJS-related files
COPY . .

# Build the workflow worker
RUN pnpm --filter @issue-to-pr/workflow-workers build

# Production stage
FROM node:22-alpine AS production
WORKDIR /app

RUN npm install -g pnpm

# Copy workspace manifests for production install
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/workers/workflow-workers/package.json apps/workers/workflow-workers/

# Install only production deps for the workflow worker
RUN pnpm install --frozen-lockfile --prod --filter @issue-to-pr/workflow-workers...

# Copy the built workflow worker
COPY --from=builder /app/apps/workers/workflow-workers/dist ./apps/workers/workflow-workers/dist

ENV NODE_ENV=production
# Send SIGTERM and allow time to shutdown gracefully
STOPSIGNAL SIGTERM
CMD ["pnpm", "--filter", "@issue-to-pr/workflow-workers", "start"]

