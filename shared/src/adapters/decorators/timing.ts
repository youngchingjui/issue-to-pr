import type { Result } from "@/shared/entities/result"
import { Issue } from "@/shared/ports/github/issue.writer"
import {
  type CreateIssueInput,
  type GithubIssueErrors,
  IssueWriterPort,
} from "@/shared/ports/github/issue.writer"
import { withTiming } from "@/shared/utils/telemetry"

export class TimedIssueWriterPort implements IssueWriterPort {
  constructor(
    private inner: IssueWriterPort,
    private labelPrefix = "GitHub",
    private enabled = process.env.ENABLE_TIMING === "1"
  ) {}

  async createIssue(
    input: CreateIssueInput
  ): Promise<Result<Issue, GithubIssueErrors>> {
    if (!this.enabled) {
      return this.inner.createIssue(input)
    }

    return withTiming(`${this.labelPrefix}: createIssue`, () =>
      this.inner.createIssue(input)
    )
  }
}

/**
 * Generic proxy-based timing decorator for any object.
 * Automatically wraps all async methods with timing when ENABLE_TIMING=1.
 */
export function decorateWithTiming<T extends object>(
  impl: T,
  opts: { labelPrefix?: string; enabled?: boolean } = {}
): T {
  const enabled = opts.enabled ?? process.env.ENABLE_TIMING === "1"
  if (!enabled) return impl

  return new Proxy(impl, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== "function") return value

      return async (...args: unknown[]) => {
        const label = `${opts.labelPrefix ?? target.constructor.name}: ${String(prop)}`
        return withTiming(label, () => value.apply(target, args))
      }
    },
  })
}
