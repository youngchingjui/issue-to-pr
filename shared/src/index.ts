// Core ports
export type {
  WorkerPort,
  WorkerJobData,
  WorkerJobResult,
  WorkerEvent,
  WorkerEventType,
} from "./core/ports/WorkerPort.js"
export type { RedisPort } from "./core/ports/RedisPort.js"

// Business logic services
export { WorkerService } from "./lib/WorkerService.js"
export type { WorkerDefinition, QueueDefinition } from "./lib/WorkerService.js"

// Job processors
export { processAutoResolveIssue } from "./lib/jobs/autoResolveIssue.js"
export { processCommentOnIssue } from "./lib/jobs/commentOnIssue.js"
export { processResolveIssue } from "./lib/jobs/resolveIssue.js"
export type { AutoResolveIssueJobData } from "./lib/jobs/autoResolveIssue.js"
export type { CommentOnIssueJobData } from "./lib/jobs/commentOnIssue.js"
export type { ResolveIssueJobData } from "./lib/jobs/resolveIssue.js"

// Infrastructure adapters
export { BullMQAdapter } from "./adapters/BullMQAdapter.js"

// Utilities
export {
  getRedisAdapter,
  getRedisClient,
  getBullMQRedisClient,
  closeRedisConnection,
} from "./lib/redis.js"
