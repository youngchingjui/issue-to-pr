import { RedisAdapter } from "@/adapters/ioredis-adapter"
import { UpstashRedisAdapter } from "@/adapters/upstash-redis"
import type { RedisPort } from "@/core/ports/RedisPort"

// TODO: I'm not sure this is the right implementation.
// We should not be guessing which redis adapter we're providing.
// Any application should directly call which redis adapter it's going to use.
// Might not need this factory.

/**
 * Factory for creating Redis adapters based on environment configuration
 * This handles the adapter selection logic that was previously in the lib layer
 */
export class RedisAdapterFactory {
  /**
   * Create a Redis adapter based on environment variables
   * @returns RedisPort instance
   */
  static createAdapter(): RedisPort {
    // Choose adapter based on environment variables
    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      console.log("[Redis] Using Upstash Redis adapter")
      return new UpstashRedisAdapter()
    } else {
      console.log("[Redis] Using ioredis adapter")
      return new RedisAdapter()
    }
  }

  /**
   * Create a Redis adapter with explicit configuration
   * @param useUpstash Whether to use Upstash Redis
   * @param url Optional Redis URL for ioredis adapter
   * @returns RedisPort instance
   */
  static createAdapterWithConfig(useUpstash: boolean, url?: string): RedisPort {
    if (useUpstash) {
      console.log("[Redis] Using Upstash Redis adapter")
      return new UpstashRedisAdapter()
    } else {
      console.log("[Redis] Using ioredis adapter")
      return new RedisAdapter(url)
    }
  }
}
