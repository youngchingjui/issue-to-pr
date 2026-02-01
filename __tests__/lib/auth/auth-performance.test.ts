/**
 * Auth Performance Integration Tests
 *
 * These tests measure the performance of the auth system, specifically:
 * - Token refresh mechanism
 * - Redis lock contention
 * - Concurrent auth() call handling
 *
 * Run with: pnpm test:auth-perf
 *
 * Use these tests to measure before/after performance when making auth optimizations.
 */

import {
  createInstrumentedRedisMock,
  RedisInstrumentation,
} from "./redis-instrumentation"

// Performance thresholds (adjust based on requirements)
const THRESHOLDS = {
  // Maximum acceptable time for a single auth() call with valid token
  VALID_TOKEN_MAX_MS: 50,
  // Maximum acceptable time for concurrent auth() calls with valid token
  CONCURRENT_VALID_TOKEN_MAX_MS: 100,
  // Maximum acceptable Redis operations per auth() call
  MAX_REDIS_OPS_PER_AUTH: 2,
  // Maximum acceptable time for token refresh (single caller)
  REFRESH_SINGLE_MAX_MS: 500,
  // Maximum acceptable time for concurrent refresh (3 callers)
  REFRESH_CONCURRENT_MAX_MS: 1000,
}

interface TestResult {
  testName: string
  passed: boolean
  durationMs: number
  redisOperations: number
  redisLatencyMs: number
  details: Record<string, unknown>
}

const testResults: TestResult[] = []

describe("Auth Performance Tests", () => {
  let instrumentation: RedisInstrumentation
  let mockRedis: ReturnType<typeof createInstrumentedRedisMock>

  beforeEach(() => {
    instrumentation = new RedisInstrumentation()
    // Use 0ms latency for baseline, can adjust to simulate network latency
    mockRedis = createInstrumentedRedisMock(instrumentation, 0)
    mockRedis._clear()
    instrumentation.reset()
  })

  afterAll(() => {
    // Print summary of all test results
    console.log("\n")
    console.log("╔══════════════════════════════════════════════════════════════════╗")
    console.log("║              AUTH PERFORMANCE TEST SUMMARY                       ║")
    console.log("╠══════════════════════════════════════════════════════════════════╣")

    for (const result of testResults) {
      const status = result.passed ? "✓" : "✗"
      const durationStr = `${result.durationMs.toFixed(2)}ms`.padStart(10)
      const redisOps = `${result.redisOperations} ops`.padStart(8)
      console.log(
        `║ ${status} ${result.testName.padEnd(35)} ${durationStr} ${redisOps} ║`
      )
    }

    console.log("╚══════════════════════════════════════════════════════════════════╝")
  })

  describe("Baseline: Valid Token (No Refresh)", () => {
    it("should handle single auth() call efficiently", async () => {
      const startTime = performance.now()

      // Simulate a valid token in cache
      const validToken = createMockToken({ expired: false })
      await mockRedis.set(`token_test-user`, JSON.stringify(validToken))
      instrumentation.reset() // Don't count setup

      // Simulate auth check (what jwt callback does)
      const cachedToken = await mockRedis.get(`token_test-user`)
      const token = cachedToken ? JSON.parse(cachedToken) : null

      const endTime = performance.now()
      const durationMs = endTime - startTime
      const metrics = instrumentation.getMetrics()

      const passed =
        durationMs < THRESHOLDS.VALID_TOKEN_MAX_MS &&
        metrics.totalOperations <= THRESHOLDS.MAX_REDIS_OPS_PER_AUTH

      testResults.push({
        testName: "Single auth() - valid token",
        passed,
        durationMs,
        redisOperations: metrics.totalOperations,
        redisLatencyMs: metrics.totalDurationMs,
        details: {
          tokenFound: !!token,
          threshold: THRESHOLDS.VALID_TOKEN_MAX_MS,
        },
      })

      expect(token).not.toBeNull()
      expect(durationMs).toBeLessThan(THRESHOLDS.VALID_TOKEN_MAX_MS)
      expect(metrics.totalOperations).toBeLessThanOrEqual(
        THRESHOLDS.MAX_REDIS_OPS_PER_AUTH
      )
    })

    it("should handle 3 concurrent auth() calls efficiently", async () => {
      // Simulate a valid token in cache
      const validToken = createMockToken({ expired: false })
      await mockRedis.set(`token_test-user`, JSON.stringify(validToken))
      instrumentation.reset() // Don't count setup

      const startTime = performance.now()

      // Simulate 3 concurrent auth checks (like layout + nav + page)
      const results = await Promise.all([
        mockRedis.get(`token_test-user`),
        mockRedis.get(`token_test-user`),
        mockRedis.get(`token_test-user`),
      ])

      const endTime = performance.now()
      const durationMs = endTime - startTime
      const metrics = instrumentation.getMetrics()

      const passed = durationMs < THRESHOLDS.CONCURRENT_VALID_TOKEN_MAX_MS

      testResults.push({
        testName: "3 concurrent auth() - valid token",
        passed,
        durationMs,
        redisOperations: metrics.totalOperations,
        redisLatencyMs: metrics.totalDurationMs,
        details: {
          allTokensFound: results.every((r) => r !== null),
          threshold: THRESHOLDS.CONCURRENT_VALID_TOKEN_MAX_MS,
        },
      })

      expect(results.every((r) => r !== null)).toBe(true)
      expect(durationMs).toBeLessThan(THRESHOLDS.CONCURRENT_VALID_TOKEN_MAX_MS)

      instrumentation.printReport("3 Concurrent Valid Token")
    })
  })

  describe("Token Refresh: Lock Contention", () => {
    it("should handle single caller refresh efficiently", async () => {
      const startTime = performance.now()
      instrumentation.reset()

      // Simulate refresh flow (simplified)
      const lockKey = `token_refresh_lock_test-user`
      const tokenKey = `token_test-user`

      // Try to acquire lock
      const lockAcquired = await mockRedis.set(lockKey, "locked", {
        ex: 10,
        nx: true,
      })

      if (lockAcquired) {
        // Check for cached token
        const cachedToken = await mockRedis.get(tokenKey)

        if (!cachedToken) {
          // Simulate GitHub API call (50ms)
          await simulateGitHubRefresh(50)

          // Store new token
          const newToken = createMockToken({ expired: false })
          await mockRedis.set(tokenKey, JSON.stringify(newToken), { ex: 3600 })
        }

        // Release lock
        await mockRedis.del(lockKey)
      }

      const endTime = performance.now()
      const durationMs = endTime - startTime
      const metrics = instrumentation.getMetrics()

      const passed = durationMs < THRESHOLDS.REFRESH_SINGLE_MAX_MS

      testResults.push({
        testName: "Single caller refresh",
        passed,
        durationMs,
        redisOperations: metrics.totalOperations,
        redisLatencyMs: metrics.totalDurationMs,
        details: {
          lockAcquired,
          threshold: THRESHOLDS.REFRESH_SINGLE_MAX_MS,
        },
      })

      expect(lockAcquired).toBe("OK")
      expect(durationMs).toBeLessThan(THRESHOLDS.REFRESH_SINGLE_MAX_MS)

      instrumentation.printReport("Single Caller Refresh")
    })

    it("should handle 3 concurrent callers during refresh", async () => {
      const startTime = performance.now()
      instrumentation.reset()

      const lockKey = `token_refresh_lock_test-user`
      const tokenKey = `token_test-user`
      const retryDelay = 10 // Reduced for testing
      const maxRetries = 50

      async function simulateRefreshCaller(
        callerId: number
      ): Promise<{ gotLock: boolean; attempts: number; durationMs: number }> {
        const callerStart = performance.now()
        let attempts = 0
        let gotLock = false

        while (attempts < maxRetries) {
          attempts++

          const lockAcquired = await mockRedis.set(lockKey, `caller-${callerId}`, {
            ex: 10,
            nx: true,
          })

          if (lockAcquired) {
            gotLock = true

            // Check for cached token first
            const cachedToken = await mockRedis.get(tokenKey)

            if (!cachedToken) {
              // Simulate GitHub API call
              await simulateGitHubRefresh(50)

              // Store new token
              const newToken = createMockToken({ expired: false })
              await mockRedis.set(tokenKey, JSON.stringify(newToken), {
                ex: 3600,
              })
            }

            // Release lock
            await mockRedis.del(lockKey)
            break
          } else {
            // Wait then check for cached token
            await new Promise((resolve) => setTimeout(resolve, retryDelay))

            const cachedToken = await mockRedis.get(tokenKey)
            if (cachedToken) {
              break
            }
          }
        }

        return {
          gotLock,
          attempts,
          durationMs: performance.now() - callerStart,
        }
      }

      // Launch 3 concurrent callers
      const results = await Promise.all([
        simulateRefreshCaller(1),
        simulateRefreshCaller(2),
        simulateRefreshCaller(3),
      ])

      const endTime = performance.now()
      const durationMs = endTime - startTime
      const metrics = instrumentation.getMetrics()

      const lockHolders = results.filter((r) => r.gotLock).length
      const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0)

      const passed = durationMs < THRESHOLDS.REFRESH_CONCURRENT_MAX_MS

      testResults.push({
        testName: "3 concurrent callers refresh",
        passed,
        durationMs,
        redisOperations: metrics.totalOperations,
        redisLatencyMs: metrics.totalDurationMs,
        details: {
          lockHolders,
          totalAttempts,
          results,
          threshold: THRESHOLDS.REFRESH_CONCURRENT_MAX_MS,
        },
      })

      // At least one caller should have gotten the lock
      expect(lockHolders).toBeGreaterThanOrEqual(1)
      expect(durationMs).toBeLessThan(THRESHOLDS.REFRESH_CONCURRENT_MAX_MS)

      instrumentation.printReport("3 Concurrent Callers Refresh")
    })
  })

  describe("With Simulated Network Latency", () => {
    it("should measure impact of 50ms Redis latency on 3 concurrent auth calls", async () => {
      // Create mock with 50ms latency per operation
      const slowInstrumentation = new RedisInstrumentation()
      const slowRedis = createInstrumentedRedisMock(slowInstrumentation, 50)

      // Setup token
      const validToken = createMockToken({ expired: false })
      await slowRedis.set(`token_test-user`, JSON.stringify(validToken))
      slowInstrumentation.reset()

      const startTime = performance.now()

      // 3 concurrent calls
      await Promise.all([
        slowRedis.get(`token_test-user`),
        slowRedis.get(`token_test-user`),
        slowRedis.get(`token_test-user`),
      ])

      const endTime = performance.now()
      const durationMs = endTime - startTime
      const metrics = slowInstrumentation.getMetrics()

      testResults.push({
        testName: "3 concurrent (50ms latency)",
        passed: true, // Informational only
        durationMs,
        redisOperations: metrics.totalOperations,
        redisLatencyMs: metrics.totalDurationMs,
        details: {
          latencyPerOp: 50,
          note: "Simulates Upstash-like latency",
        },
      })

      slowInstrumentation.printReport("50ms Latency Simulation")

      // With 50ms latency, 3 concurrent calls should still complete concurrently
      // so total time should be ~50-60ms, not 150ms (sequential)
      expect(durationMs).toBeLessThan(100) // Concurrent should be fast
    })

    it("should measure impact of 500ms Redis latency (current Upstash)", async () => {
      // Simulate current observed Upstash latency
      const upstashInstrumentation = new RedisInstrumentation()
      const upstashRedis = createInstrumentedRedisMock(upstashInstrumentation, 500)

      const validToken = createMockToken({ expired: false })
      await upstashRedis.set(`token_test-user`, JSON.stringify(validToken))
      upstashInstrumentation.reset()

      const startTime = performance.now()

      // 3 concurrent calls
      await Promise.all([
        upstashRedis.get(`token_test-user`),
        upstashRedis.get(`token_test-user`),
        upstashRedis.get(`token_test-user`),
      ])

      const endTime = performance.now()
      const durationMs = endTime - startTime
      const metrics = upstashInstrumentation.getMetrics()

      testResults.push({
        testName: "3 concurrent (500ms latency)",
        passed: true, // Informational only
        durationMs,
        redisOperations: metrics.totalOperations,
        redisLatencyMs: metrics.totalDurationMs,
        details: {
          latencyPerOp: 500,
          note: "Simulates observed Upstash latency",
        },
      })

      upstashInstrumentation.printReport("500ms Latency (Current Upstash)")
    })
  })

  describe("Ping-on-Every-Call Overhead", () => {
    it("should measure overhead of current ping pattern", async () => {
      const pingInstrumentation = new RedisInstrumentation()
      const pingRedis = createInstrumentedRedisMock(pingInstrumentation, 50)

      const validToken = createMockToken({ expired: false })
      await pingRedis.set(`token_test-user`, JSON.stringify(validToken))
      pingInstrumentation.reset()

      const startTime = performance.now()

      // Simulate current pattern: ping before every operation
      async function getWithPing(key: string) {
        await pingRedis.ping() // Current pattern pings first
        return pingRedis.get(key)
      }

      await Promise.all([
        getWithPing(`token_test-user`),
        getWithPing(`token_test-user`),
        getWithPing(`token_test-user`),
      ])

      const endTime = performance.now()
      const durationMs = endTime - startTime
      const metrics = pingInstrumentation.getMetrics()

      testResults.push({
        testName: "3 concurrent (with ping overhead)",
        passed: true,
        durationMs,
        redisOperations: metrics.totalOperations,
        redisLatencyMs: metrics.totalDurationMs,
        details: {
          pingsCount: metrics.operationsByType["ping"] || 0,
          getsCount: metrics.operationsByType["get"] || 0,
          note: "Current pattern: ping + get per call",
        },
      })

      pingInstrumentation.printReport("Ping-on-Every-Call Pattern")

      // Should have 3 pings + 3 gets = 6 operations
      expect(metrics.totalOperations).toBe(6)
    })

    it("should measure performance without ping overhead", async () => {
      const noPingInstrumentation = new RedisInstrumentation()
      const noPingRedis = createInstrumentedRedisMock(noPingInstrumentation, 50)

      const validToken = createMockToken({ expired: false })
      await noPingRedis.set(`token_test-user`, JSON.stringify(validToken))
      noPingInstrumentation.reset()

      const startTime = performance.now()

      // Direct get without ping (optimized pattern)
      await Promise.all([
        noPingRedis.get(`token_test-user`),
        noPingRedis.get(`token_test-user`),
        noPingRedis.get(`token_test-user`),
      ])

      const endTime = performance.now()
      const durationMs = endTime - startTime
      const metrics = noPingInstrumentation.getMetrics()

      testResults.push({
        testName: "3 concurrent (no ping overhead)",
        passed: true,
        durationMs,
        redisOperations: metrics.totalOperations,
        redisLatencyMs: metrics.totalDurationMs,
        details: {
          note: "Optimized pattern: just get, no ping",
        },
      })

      noPingInstrumentation.printReport("No Ping Overhead (Optimized)")

      // Should have just 3 gets
      expect(metrics.totalOperations).toBe(3)
    })
  })

  describe("React cache() Deduplication Simulation", () => {
    it("should show benefit of request-level caching", async () => {
      const cacheInstrumentation = new RedisInstrumentation()
      const cacheRedis = createInstrumentedRedisMock(cacheInstrumentation, 50)

      const validToken = createMockToken({ expired: false })
      await cacheRedis.set(`token_test-user`, JSON.stringify(validToken))
      cacheInstrumentation.reset()

      // Simulate React cache() behavior with proper promise deduplication
      // This is how React's cache() actually works - it returns the same promise
      // for concurrent calls
      const cache = new Map<string, Promise<string | null>>()

      function cachedGet(key: string): Promise<string | null> {
        if (cache.has(key)) {
          return cache.get(key)! // Return the same promise
        }
        const promise = cacheRedis.get(key)
        cache.set(key, promise)
        return promise
      }

      const startTime = performance.now()

      // 3 concurrent calls - all should share the same promise
      const results = await Promise.all([
        cachedGet(`token_test-user`),
        cachedGet(`token_test-user`),
        cachedGet(`token_test-user`),
      ])

      const endTime = performance.now()
      const durationMs = endTime - startTime
      const metrics = cacheInstrumentation.getMetrics()

      testResults.push({
        testName: "3 calls with React cache()",
        passed: true,
        durationMs,
        redisOperations: metrics.totalOperations,
        redisLatencyMs: metrics.totalDurationMs,
        details: {
          note: "Simulates React cache() deduplication",
          redisCallsSaved: 2,
        },
      })

      cacheInstrumentation.printReport("With React cache() Deduplication")

      // Should only have 1 Redis call thanks to caching
      expect(metrics.totalOperations).toBe(1)
      expect(results.every((r) => r !== null)).toBe(true)
    })
  })
})

// Helper functions

function createMockToken(options: { expired: boolean }): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000)
  return {
    sub: "test-user",
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_at: options.expired ? now - 3600 : now + 3600,
    authMethod: "github-app",
    profile: { login: "test-user" },
  }
}

async function simulateGitHubRefresh(delayMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs))
}
