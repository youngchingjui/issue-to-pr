import type { Result } from "@shared/entities/result"
import {
  type GetIssueErrors,
  type IssueDetails,
  IssueReaderPort,
  type IssueRef,
  type IssueTitleResult,
} from "@shared/ports/github/issue.reader"
import {
  type CreateIssueInput,
  type GithubIssueErrors,
  IssueWriterPort,
} from "@shared/ports/github/issue.writer"
import { Issue } from "@shared/ports/github/issue.writer"
import { withTiming } from "@shared/utils/telemetry"

/**
 * Timing decorator for GitHubIssuesPort that adds telemetry to all methods.
 * Only instruments when ENABLE_TIMING=1, otherwise delegates directly to the inner adapter.
 */
export class TimedIssueReaderPort implements IssueReaderPort {
  constructor(
    private inner: IssueReaderPort,
    private labelPrefix = "GitHub",
    private enabled = process.env.ENABLE_TIMING === "1"
  ) {}

  async getIssue(ref: IssueRef): Promise<Result<IssueDetails, GetIssueErrors>> {
    if (!this.enabled) return this.inner.getIssue(ref)
    return withTiming(`${this.labelPrefix}: getIssue`, () =>
      this.inner.getIssue(ref)
    )
  }

  async getIssueTitles(refs: IssueRef[]): Promise<IssueTitleResult[]> {
    if (!this.enabled) {
      return this.inner.getIssueTitles(refs)
    }

    return withTiming(
      `${this.labelPrefix}: getIssueTitles`,
      () => this.inner.getIssueTitles(refs),
      { batchSize: refs.length }
    )
  }
}

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
