# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace manifests first for better caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/workers/package.json apps/workers/

# Install deps only for the worker (and its transitive deps)
RUN pnpm install --frozen-lockfile --filter @issue-to-pr/worker...

# Copy source
# TODO: Investigate NOT copying the NextJS-related files
COPY . .

# Build the worker
RUN pnpm --filter @issue-to-pr/worker build

# Production stage
FROM node:22-alpine AS production
WORKDIR /app

RUN npm install -g pnpm

# Copy workspace manifests for production install
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/workers/package.json apps/workers/

# Install only production deps for the worker
RUN pnpm install --frozen-lockfile --prod --filter @issue-to-pr/worker...

# Copy the built worker
COPY --from=builder /app/apps/workers/dist ./apps/workers/dist

ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@issue-to-pr/worker", "start"]