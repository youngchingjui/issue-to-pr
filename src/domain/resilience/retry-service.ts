// src/domain/resilience/retry-service.ts
import type { RetryOptions } from "../../types/repository-setup"

const defaultRetryOptions: RetryOptions = {
  maxAttempts: 3,
  backoffStrategy: "exponential",
  retryableErrors: [Error],
}

export const createRetryService = () => ({
  withRetry: async <T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> => {
    const config = { ...defaultRetryOptions, ...options }
    return withRetryLogic(operation, config)
  },
})

const withRetryLogic = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> => {
  let lastError: Error

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error

      if (attempt === options.maxAttempts) {
        throw lastError
      }

      if (!isRetryableError(error, options.retryableErrors)) {
        throw error
      }

      const delay = calculateBackoff(attempt, options.backoffStrategy)
      console.warn(
        `[WARNING] Operation failed, retrying in ${delay}ms... (${options.maxAttempts - attempt} attempts left)`
      )
      await sleep(delay)
    }
  }

  throw lastError!
}

const isRetryableError = (
  error: unknown,
  retryableErrors: Array<new (...args: any[]) => Error>
): boolean => {
  return retryableErrors.some((ErrorClass) => error instanceof ErrorClass)
}

const calculateBackoff = (
  attempt: number,
  strategy: RetryOptions["backoffStrategy"]
): number => {
  switch (strategy) {
    case "exponential":
      return Math.min(1000 * Math.pow(2, attempt - 1), 10000)
    case "linear":
      return 1000 * attempt
    default:
      return 1000
  }
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))
