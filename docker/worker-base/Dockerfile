# syntax=docker/dockerfile:1.7-labs
# Minimal base for Node workers with pnpm and tini (graceful signal handling)
FROM node:22-alpine
ENV NODE_ENV=production
RUN apk add --no-cache tini && corepack enable
WORKDIR /app
RUN addgroup -S nodejs && adduser -S node -G nodejs \
  && chown -R node:nodejs /app
USER node
ENTRYPOINT ["/sbin/tini", "--"]

