//TODO: Rename the folders so they don't use number letter indexing anymore
//i.e. 0 core -> core, 1a lib -> lib, 1b adapters -> adapters, etc.

// Core ports and interfaces
export {
  RedisConnection,
  RedisPort,
  RedisSubscription,
} from "./0 core/ports/RedisPort.js"

// Adapters
export { RedisAdapter } from "./1b adapters/redis.js"
export { UpstashRedisAdapter } from "./1b adapters/upstash-redis.js"

// Library functions
export {
  getBullMQRedisClient,
  getRedisAdapter,
  getRedisClient,
} from "./1a lib/redis.js"
