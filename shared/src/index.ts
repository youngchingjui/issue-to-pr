// Core ports
export type { RedisPort } from "./core/ports/RedisPort"
export type {
  WorkerEvent,
  WorkerEventType,
  WorkerJobData,
  WorkerJobResult,
  WorkerPort,
} from "./core/ports/WorkerPort"

// Business logic services
export { createRedisService, RedisService } from "./lib/redis"
export type { QueueDefinition, WorkerDefinition } from "./lib/WorkerService"
export { WorkerService } from "./lib/WorkerService"

// Job processors
export type { AutoResolveIssueJobData } from "./lib/jobs/autoResolveIssue"
export { processAutoResolveIssue } from "./lib/jobs/autoResolveIssue"
export type { CommentOnIssueJobData } from "./lib/jobs/commentOnIssue"
export { processCommentOnIssue } from "./lib/jobs/commentOnIssue"
export type { ResolveIssueJobData } from "./lib/jobs/resolveIssue"
export { processResolveIssue } from "./lib/jobs/resolveIssue"

// Infrastructure adapters
export { BullMQAdapter } from "./adapters/BullMQAdapter"
export { RedisAdapterFactory } from "./adapters/redis-adapter-factory"
