/**
 * Redis Instrumentation for Auth Performance Tests
 *
 * Tracks all Redis operations: count, latency, and operation types.
 * Used to measure auth system performance before/after optimizations.
 */

export interface RedisOperation {
  operation: string
  args: unknown[]
  startTime: number
  endTime: number
  durationMs: number
  success: boolean
  error?: string
}

export interface RedisMetrics {
  totalOperations: number
  totalDurationMs: number
  avgDurationMs: number
  minDurationMs: number
  maxDurationMs: number
  operationsByType: Record<string, number>
  operations: RedisOperation[]
}

/**
 * Tracks Redis operations for performance analysis
 */
export class RedisInstrumentation {
  private operations: RedisOperation[] = []
  private enabled = true

  reset(): void {
    this.operations = []
  }

  disable(): void {
    this.enabled = false
  }

  enable(): void {
    this.enabled = true
  }

  recordOperation(
    operation: string,
    args: unknown[],
    startTime: number,
    endTime: number,
    success: boolean,
    error?: string
  ): void {
    if (!this.enabled) return

    this.operations.push({
      operation,
      args,
      startTime,
      endTime,
      durationMs: endTime - startTime,
      success,
      error,
    })
  }

  getMetrics(): RedisMetrics {
    if (this.operations.length === 0) {
      return {
        totalOperations: 0,
        totalDurationMs: 0,
        avgDurationMs: 0,
        minDurationMs: 0,
        maxDurationMs: 0,
        operationsByType: {},
        operations: [],
      }
    }

    const durations = this.operations.map((op) => op.durationMs)
    const operationsByType: Record<string, number> = {}

    for (const op of this.operations) {
      operationsByType[op.operation] =
        (operationsByType[op.operation] || 0) + 1
    }

    return {
      totalOperations: this.operations.length,
      totalDurationMs: durations.reduce((sum, d) => sum + d, 0),
      avgDurationMs: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDurationMs: Math.min(...durations),
      maxDurationMs: Math.max(...durations),
      operationsByType,
      operations: [...this.operations],
    }
  }

  /**
   * Print a formatted report of Redis metrics
   */
  printReport(testName: string): void {
    const metrics = this.getMetrics()

    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  REDIS PERFORMANCE REPORT: ${testName.padEnd(36)} ║
╠══════════════════════════════════════════════════════════════════╣
║  Total Operations: ${String(metrics.totalOperations).padStart(5)}                                      ║
║  Total Duration:   ${String(metrics.totalDurationMs.toFixed(2) + "ms").padStart(12)}                               ║
║  Avg Duration:     ${String(metrics.avgDurationMs.toFixed(2) + "ms").padStart(12)}                               ║
║  Min Duration:     ${String(metrics.minDurationMs.toFixed(2) + "ms").padStart(12)}                               ║
║  Max Duration:     ${String(metrics.maxDurationMs.toFixed(2) + "ms").padStart(12)}                               ║
╠══════════════════════════════════════════════════════════════════╣
║  Operations by Type:                                             ║
${Object.entries(metrics.operationsByType)
  .map(([op, count]) => `║    ${op.padEnd(15)} ${String(count).padStart(5)}                                      ║`)
  .join("\n")}
╚══════════════════════════════════════════════════════════════════╝
`)
  }
}

// Global instrumentation instance
export const redisInstrumentation = new RedisInstrumentation()

/**
 * Create an instrumented Redis mock that tracks all operations
 */
export function createInstrumentedRedisMock(
  instrumentation: RedisInstrumentation,
  latencyMs: number = 0
) {
  const storage = new Map<string, { value: string; expiresAt?: number }>()

  const simulateLatency = async () => {
    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs))
    }
  }

  return {
    async ping(): Promise<string> {
      const start = performance.now()
      await simulateLatency()
      const end = performance.now()
      instrumentation.recordOperation("ping", [], start, end, true)
      return "PONG"
    },

    async set(
      key: string,
      value: string,
      options?: { ex?: number; nx?: boolean }
    ): Promise<string | null> {
      const start = performance.now()
      await simulateLatency()

      // NX: only set if not exists
      if (options?.nx && storage.has(key)) {
        const existing = storage.get(key)!
        if (!existing.expiresAt || existing.expiresAt > Date.now()) {
          const end = performance.now()
          instrumentation.recordOperation(
            "set",
            [key, "...", options],
            start,
            end,
            true
          )
          return null
        }
      }

      const expiresAt = options?.ex
        ? Date.now() + options.ex * 1000
        : undefined
      storage.set(key, { value, expiresAt })

      const end = performance.now()
      instrumentation.recordOperation(
        "set",
        [key, "...", options],
        start,
        end,
        true
      )
      return "OK"
    },

    async get(key: string): Promise<string | null> {
      const start = performance.now()
      await simulateLatency()

      const entry = storage.get(key)
      let result: string | null = null

      if (entry) {
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          storage.delete(key)
        } else {
          result = entry.value
        }
      }

      const end = performance.now()
      instrumentation.recordOperation("get", [key], start, end, true)
      return result
    },

    async del(key: string): Promise<number> {
      const start = performance.now()
      await simulateLatency()

      const existed = storage.has(key)
      storage.delete(key)

      const end = performance.now()
      instrumentation.recordOperation("del", [key], start, end, true)
      return existed ? 1 : 0
    },

    async exists(key: string): Promise<number> {
      const start = performance.now()
      await simulateLatency()

      const entry = storage.get(key)
      let exists = 0

      if (entry) {
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          storage.delete(key)
        } else {
          exists = 1
        }
      }

      const end = performance.now()
      instrumentation.recordOperation("exists", [key], start, end, true)
      return exists
    },

    // Helper to clear storage between tests
    _clear(): void {
      storage.clear()
    },

    // Helper to inspect storage
    _getStorage(): Map<string, { value: string; expiresAt?: number }> {
      return storage
    },
  }
}

export type InstrumentedRedis = ReturnType<typeof createInstrumentedRedisMock>
