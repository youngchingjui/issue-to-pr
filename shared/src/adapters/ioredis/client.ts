import IORedis, { RedisOptions } from "ioredis"

// Roles describe how a connection is used. Some can be shared safely, others must be dedicated.
export type RedisRole =
  | "general"
  | "publisher"
  | "subscriber"
  | "bullmq:queue"
  | "bullmq:worker"
  | "bullmq:events"

// Lazily-initialised Redis connections, cached per-URL+role.
// Re-using the same connection prevents BullMQ from spawning extra listeners
// and helps keep the number of open descriptors low in serverless environments.
const connectionByKey = new Map<string, IORedis>()

const CONNECTION_NAME_PREFIX = "itp"

function keyFor(url: string, role: RedisRole) {
  return `${url}::${role}`
}

function connectionNameFor(role: RedisRole) {
  return `${CONNECTION_NAME_PREFIX}:${role}:${process.pid}`
}

// Defaults tuned per role. You can override via options param on each getter.
function defaultsFor(role: RedisRole): RedisOptions {
  const base: RedisOptions = {
    connectionName: connectionNameFor(role),
    family: 4,
    connectTimeout: 10000,
    retryStrategy: (times) => {
      const delay = Math.min(1000 * Math.pow(2, times), 30000)
      return delay
    },
  }
  // BullMQ recommends maxRetriesPerRequest: null to avoid timeouts at the ioredis layer.
  // Worker and QueueEvents perform blocking commands, so they should always be isolated.
  switch (role) {
    case "bullmq:worker":
    case "bullmq:events":
    case "bullmq:queue":
      return {
        ...base,
        maxRetriesPerRequest: null,
      }
    case "subscriber":
      return {
        ...base,
        maxRetriesPerRequest: null,
      }
    case "publisher":
    case "general":
    default:
      return base
  }
}

/**
 * Provides a Redis connection for a given URL and role.
 * Be sure to use the right role.
 * Available roles:
 * - "general" - Used for general purposes or publishers. If you need hard separation, use "publisher".
 * - "publisher"
 * - "subscriber" - Must be dedicated (SUB mode). You can either:
 *   1) Use a shared, process-level subscriber (keeps connections very low).
 *   2) Create ephemeral subscribers per request (safer isolation, more connections).
 *    Choose based on your traffic envelope and connection limits.
 * - "bullmq:worker"
 * - "bullmq:events"
 * - "bullmq:queue"
 *
 * Usage:
 *   const redis = getRedisConnection(redisUrl, "general");
 *   // or with a specific role:
 *   const redis = getRedisConnection(redisUrl, "subscriber");
 *
 * - `redisUrl`: The Redis server URL.
 * - `role`: The intended usage role for the connection (e.g., "general", "publisher", "subscriber", "bullmq:worker", etc.).
 * - `options`: (Optional) Additional ioredis options to override defaults.
 *
 * Returns an ioredis client instance
 * If client already exists, it will be returned.
 */
export function getRedisConnection(
  redisUrl: string,
  role: RedisRole,
  options: RedisOptions = {}
): IORedis {
  const k = keyFor(redisUrl, role)
  const existing = connectionByKey.get(k)
  if (existing) return existing

  const opts = { ...defaultsFor(role), ...options }
  const conn = new IORedis(redisUrl, opts)

  conn.on("error", (err) =>
    console.error(
      `[redis:${k}]`,
      err instanceof Error ? err.message : String(err)
    )
  )
  connectionByKey.set(k, conn)
  return conn
}

// For request-scoped streams (e.g., SSE), prefer an ephemeral subscriber duplicated from a base connection.
export function createEphemeralSubscriber(
  redisUrl: string,
  options: RedisOptions = {}
): IORedis {
  // duplicate() copies options; ensure connectionName is still helpful
  const base = getRedisConnection(redisUrl, "general")
  const sub = base.duplicate({ ...defaultsFor("subscriber"), ...options })
  return sub
}
