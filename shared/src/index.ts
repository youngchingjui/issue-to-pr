// Core ports
export type {
  WorkerPort,
  WorkerJobData,
  WorkerJobResult,
  WorkerEvent,
  WorkerEventType,
} from "./core/ports/WorkerPort"
export type { RedisPort } from "./core/ports/RedisPort"

// Business logic services
export { WorkerService } from "./lib/WorkerService"
export type { WorkerDefinition, QueueDefinition } from "./lib/WorkerService"
export { RedisService, createRedisService } from "./lib/redis"

// Job processors
export { processAutoResolveIssue } from "./lib/jobs/autoResolveIssue"
export { processCommentOnIssue } from "./lib/jobs/commentOnIssue"
export { processResolveIssue } from "./lib/jobs/resolveIssue"
export type { AutoResolveIssueJobData } from "./lib/jobs/autoResolveIssue"
export type { CommentOnIssueJobData } from "./lib/jobs/commentOnIssue"
export type { ResolveIssueJobData } from "./lib/jobs/resolveIssue"

// Infrastructure adapters
export { BullMQAdapter } from "./adapters/BullMQAdapter"
export { RedisAdapterFactory } from "./adapters/redis-adapter-factory"
