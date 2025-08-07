import Redis from 'ioredis'

let redisClient: Redis | null = null

export async function getRedisClient(): Promise<Redis> {
  if (!redisClient) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379'
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })

    // Handle connection events
    redisClient.on('connect', () => {
      console.log('[Redis] Connected to Redis server')
    })

    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err)
    })

    redisClient.on('close', () => {
      console.log('[Redis] Connection closed')
    })

    // Wait for connection to be ready
    await redisClient.connect()
  }

  return redisClient
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}
