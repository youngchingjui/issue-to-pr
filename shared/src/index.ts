export { AnthropicAdapter } from "@/shared/src/adapters/anthropic"
export {
  decorateWithTiming,
  TimedGitHubIssuesPort,
} from "@/shared/src/adapters/decorators/timing"
export { GitHubGraphQLAdapter } from "@/shared/src/adapters/github-graphql"
export * from "@/shared/src/core/ports/github"
export * from "@/shared/src/core/ports/llm"
export * from "@/shared/src/core/ports/github-pr"
export { fetchIssueTitles } from "@/shared/src/services/github/issues"
export type { LogMeta } from "@/shared/src/utils/telemetry"
export {
  logEnd,
  logError,
  logStart,
  withTiming,
} from "@/shared/src/utils/telemetry"
export {
  analyzePRAndProposeIssueUpdates,
} from "@/shared/src/services/pr-comments-analysis"

