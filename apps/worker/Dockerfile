# Worker service Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package manager files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY apps/worker/package.json ./apps/worker/
COPY shared/package.json ./shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy shared library source
COPY shared/ ./shared/

# Copy worker source
COPY apps/worker/ ./apps/worker/

# Build shared library
RUN pnpm --filter shared build

# Build worker
RUN pnpm --filter worker build

# Expose port (if needed for health checks)
EXPOSE 3001

# Set environment
ENV NODE_ENV=production

# Start the worker
CMD ["pnpm", "--filter", "worker", "start"]