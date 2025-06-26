# syntax=docker/dockerfile:1
ARG NODE_VERSION=24.2.0-alpine

# -------- Stage 1: install ALL dependencies (dev + prod) --------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Install pnpm via corepack and install deps
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# -------- Stage 2: build the application --------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
RUN corepack enable

# Copy installed node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the source code
COPY . .

# Build the Next.js application
RUN pnpm run build

# -------- Stage 3: minimal runtime image --------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

# Copy necessary artifacts from the build stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Remove development dependencies to shrink final image
RUN pnpm prune --prod

EXPOSE 3000

CMD ["pnpm", "start"] 