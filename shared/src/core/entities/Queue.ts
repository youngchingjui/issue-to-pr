export const QUEUE_NAMES = {
  RESOLVE_ISSUE: "resolve-issue",
  COMMENT_ON_ISSUE: "comment-on-issue",
  AUTO_RESOLVE_ISSUE: "auto-resolve-issue",
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]
