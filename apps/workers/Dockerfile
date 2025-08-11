FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY apps/workers/package.json* ./apps/workers/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the worker
RUN pnpm worker:build

# Expose environment variables
ENV NODE_ENV=production

# Run the worker
CMD ["node", "apps/workers/dist/index.js"]