export { AnthropicAdapter } from "@/shared/src/adapters/anthropic"
export {
  decorateWithTiming,
  TimedGitHubIssuesPort,
} from "@/shared/src/adapters/decorators/timing"
export { GitHubGraphQLAdapter } from "@/shared/src/adapters/github-graphql"
export { OpenAIAdapter } from "@/shared/src/adapters/openai"
export * from "@/shared/src/entities/agent"
export * from "@/shared/src/entities/container"
export * from "@/shared/src/entities/message"
export * from "@/shared/src/ports/github"
export * from "@/shared/src/ports/llm"
export { runBasicAgent } from "@/shared/src/services/agent"
export { fetchIssueTitles } from "@/shared/src/services/github/issues"
export type { LogMeta } from "@/shared/src/utils/telemetry"
export {
  logEnd,
  logError,
  logStart,
  withTiming,
} from "@/shared/src/utils/telemetry"

// TODO: I'm not sure of the benefits here. Generally, if we're going to re-export, they should be at the shared/entities or shared/ports level. Not top-level
