import IORedis from "ioredis"

// Lazily-initialised Redis connections, cached per-URL – re-using the same
// connection prevents BullMQ from spawning extra listeners and helps keep the
// number of open file descriptors low in serverless environments.
const connectionByUrl = new Map<string, IORedis>()

export function getRedisConnection(redisUrl: string): IORedis {
  const existing = connectionByUrl.get(redisUrl)
  if (existing) return existing

  const conn = new IORedis(redisUrl)
  connectionByUrl.set(redisUrl, conn)
  return conn
}
