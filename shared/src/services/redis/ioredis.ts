import IORedis from "ioredis"

// Lazily-initialised Redis connection – re-using the same connection prevents
// BullMQ from spawning extra listeners and helps keep the number of open file
// descriptors low in serverless environments.
let connection: IORedis | null = null
export function getRedisConnection(): IORedis {
  if (connection) return connection

  const redisUrl = process.env.REDIS_URL

  if (!redisUrl) {
    throw new Error("REDIS_URL is not set")
  }

  connection = new IORedis(redisUrl)
  return connection
}

// TODO: This file should probably be in /src/adapters/redis/ioredis.ts
// To follow clean architecture principles
