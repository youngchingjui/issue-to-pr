// src-oop/domain/resilience/RetryService.ts
import { IRetryService, RetryOptions } from "../../types/repository-setup"

export class RetryService implements IRetryService {
  private readonly defaultOptions: RetryOptions = {
    maxAttempts: 3,
    backoffStrategy: "exponential",
    retryableErrors: [Error],
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const config = { ...this.defaultOptions, ...options }
    return this.executeWithRetry(operation, config)
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        if (attempt === options.maxAttempts) {
          throw lastError
        }

        if (!this.isRetryableError(error, options.retryableErrors)) {
          throw error
        }

        const delay = this.calculateBackoff(attempt, options.backoffStrategy)
        console.warn(
          `[WARNING] Operation failed, retrying in ${delay}ms... (${
            options.maxAttempts - attempt
          } attempts left)`
        )

        await this.sleep(delay)
      }
    }

    throw lastError!
  }

  private isRetryableError(
    error: unknown,
    retryableErrors: Array<new (...args: any[]) => Error>
  ): boolean {
    return retryableErrors.some((ErrorClass) => error instanceof ErrorClass)
  }

  private calculateBackoff(
    attempt: number,
    strategy: RetryOptions["backoffStrategy"]
  ): number {
    switch (strategy) {
      case "exponential":
        return Math.min(1000 * Math.pow(2, attempt - 1), 10000)
      case "linear":
        return 1000 * attempt
      default:
        return 1000
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
