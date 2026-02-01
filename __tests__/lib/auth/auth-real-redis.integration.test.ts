/**
 * Auth Performance Tests with Real Redis
 *
 * These tests use the actual Redis instance (Upstash or local) to measure
 * real-world performance. They help validate that optimizations work
 * in production conditions.
 *
 * Run with: pnpm test:auth-perf
 *
 * IMPORTANT: These tests require Redis to be configured via environment variables.
 * They will be skipped if Redis is not available.
 */

import { redis } from "@/lib/redis"

// Check if we can connect to Redis
async function canConnectToRedis(): Promise<boolean> {
  try {
    await redis.ping()
    return true
  } catch {
    return false
  }
}

describe("Real Redis Performance Tests", () => {
  let redisAvailable = false

  beforeAll(async () => {
    redisAvailable = await canConnectToRedis()
    if (!redisAvailable) {
      console.log("⚠️  Redis not available - skipping real Redis tests")
    }
  })

  describe("Redis Latency Baseline", () => {
    it("should measure real Redis ping latency", async () => {
      if (!redisAvailable) {
        console.log("Skipped - Redis not available")
        return
      }

      const results: number[] = []

      // Warm up
      await redis.ping()

      // Run 5 pings and measure
      for (let i = 0; i < 5; i++) {
        const start = performance.now()
        await redis.ping()
        results.push(performance.now() - start)
      }

      const avg = results.reduce((a, b) => a + b, 0) / results.length
      const min = Math.min(...results)
      const max = Math.max(...results)

      console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  REAL REDIS PING LATENCY                                         ║
╠══════════════════════════════════════════════════════════════════╣
║  Samples:    ${String(results.length).padStart(5)}                                              ║
║  Min:        ${String(min.toFixed(2) + "ms").padStart(10)}                                       ║
║  Avg:        ${String(avg.toFixed(2) + "ms").padStart(10)}                                       ║
║  Max:        ${String(max.toFixed(2) + "ms").padStart(10)}                                       ║
╚══════════════════════════════════════════════════════════════════╝
`)

      // Just report, don't fail
      expect(true).toBe(true)
    })

    it("should measure real Redis set/get/del latency", async () => {
      if (!redisAvailable) {
        console.log("Skipped - Redis not available")
        return
      }

      const testKey = `perf_test_${Date.now()}`
      const testValue = JSON.stringify({ test: true, timestamp: Date.now() })

      const operations: Array<{ op: string; ms: number }> = []

      // SET
      let start = performance.now()
      await redis.set(testKey, testValue, { ex: 60 })
      operations.push({ op: "SET", ms: performance.now() - start })

      // GET
      start = performance.now()
      await redis.get(testKey)
      operations.push({ op: "GET", ms: performance.now() - start })

      // DEL
      start = performance.now()
      await redis.del(testKey)
      operations.push({ op: "DEL", ms: performance.now() - start })

      const total = operations.reduce((sum, o) => sum + o.ms, 0)

      console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  REAL REDIS OPERATION LATENCY                                    ║
╠══════════════════════════════════════════════════════════════════╣
${operations.map((o) => `║  ${o.op.padEnd(10)} ${String(o.ms.toFixed(2) + "ms").padStart(12)}                                    ║`).join("\n")}
║  ────────────────────────────────────────────────────────────    ║
║  TOTAL      ${String(total.toFixed(2) + "ms").padStart(12)}                                    ║
╚══════════════════════════════════════════════════════════════════╝
`)

      expect(true).toBe(true)
    })
  })

  describe("Concurrent Auth Simulation", () => {
    it("should measure 3 concurrent Redis gets (simulating auth)", async () => {
      if (!redisAvailable) {
        console.log("Skipped - Redis not available")
        return
      }

      const testKey = `auth_perf_test_${Date.now()}`
      const mockToken = JSON.stringify({
        sub: "test-user",
        access_token: "test-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      })

      // Setup
      await redis.set(testKey, mockToken, { ex: 60 })

      // Measure 3 concurrent gets
      const start = performance.now()
      const results = await Promise.all([
        redis.get(testKey),
        redis.get(testKey),
        redis.get(testKey),
      ])
      const duration = performance.now() - start

      // Cleanup
      await redis.del(testKey)

      console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  REAL REDIS: 3 CONCURRENT GETS (Auth Simulation)                 ║
╠══════════════════════════════════════════════════════════════════╣
║  Total Time:  ${String(duration.toFixed(2) + "ms").padStart(12)}                                   ║
║  All Found:   ${results.every((r) => r !== null) ? "Yes" : "No"}                                              ║
╚══════════════════════════════════════════════════════════════════╝
`)

      expect(results.every((r) => r !== null)).toBe(true)
    })

    it("should measure lock contention scenario", async () => {
      if (!redisAvailable) {
        console.log("Skipped - Redis not available")
        return
      }

      const lockKey = `lock_perf_test_${Date.now()}`
      const tokenKey = `token_perf_test_${Date.now()}`
      const retryDelay = 100
      const maxRetries = 10

      interface CallerResult {
        callerId: number
        gotLock: boolean
        attempts: number
        durationMs: number
      }

      async function simulateCaller(callerId: number): Promise<CallerResult> {
        const start = performance.now()
        let attempts = 0
        let gotLock = false

        while (attempts < maxRetries) {
          attempts++

          const acquired = await redis.set(lockKey, `caller-${callerId}`, {
            ex: 10,
            nx: true,
          })

          if (acquired) {
            gotLock = true
            // Simulate work
            await new Promise((r) => setTimeout(r, 50))
            // Store token
            await redis.set(
              tokenKey,
              JSON.stringify({ refreshedBy: callerId }),
              { ex: 60 }
            )
            // Release lock
            await redis.del(lockKey)
            break
          } else {
            await new Promise((r) => setTimeout(r, retryDelay))
            const cached = await redis.get(tokenKey)
            if (cached) break
          }
        }

        return {
          callerId,
          gotLock,
          attempts,
          durationMs: performance.now() - start,
        }
      }

      const start = performance.now()
      const results = await Promise.all([
        simulateCaller(1),
        simulateCaller(2),
        simulateCaller(3),
      ])
      const totalDuration = performance.now() - start

      // Cleanup
      await redis.del(lockKey)
      await redis.del(tokenKey)

      const lockHolders = results.filter((r) => r.gotLock).length
      const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0)

      console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  REAL REDIS: LOCK CONTENTION (3 Concurrent Refresh)              ║
╠══════════════════════════════════════════════════════════════════╣
║  Total Time:    ${String(totalDuration.toFixed(2) + "ms").padStart(12)}                                 ║
║  Lock Holders:  ${String(lockHolders).padStart(5)}                                            ║
║  Total Attempts: ${String(totalAttempts).padStart(4)}                                            ║
╠──────────────────────────────────────────────────────────────────╣
${results.map((r) => `║  Caller ${r.callerId}: ${r.gotLock ? "Got lock" : "Waited  "} ${String(r.attempts + " attempts").padStart(12)} ${String(r.durationMs.toFixed(0) + "ms").padStart(8)} ║`).join("\n")}
╚══════════════════════════════════════════════════════════════════╝
`)

      expect(lockHolders).toBeGreaterThanOrEqual(1)
    })
  })
})
