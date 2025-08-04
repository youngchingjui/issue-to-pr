# Workers in Clean Architecture

## Overview

Workers are a crucial part of the **Infrastructure Layer** in clean architecture. They handle long-running background tasks and should follow the same architectural principles as the rest of your application.

## Current Architecture Analysis

Looking at your current worker setup, I can see you have:

- **Queue System**: BullMQ with Redis
- **Job Types**: `autoResolveIssue`, `commentOnIssue`, `resolveIssue`
- **Shared Types**: Zod schemas in `services/shared`
- **Worker Processes**: Separate Docker containers

## Clean Architecture Integration

### 1. Worker as Infrastructure Layer

Workers belong in the **Infrastructure Layer** because they:

- Handle external dependencies (Redis, queues)
- Execute long-running processes
- Manage system resources
- Don't contain business logic

```
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                     │
├─────────────────────────────────────────────────────────────┤
│  Workers  │  Repositories  │  External APIs  │  Database  │
│           │                │                 │            │
│ • Job     │ • Neo4j       │ • GitHub API   │ • Neo4j    │
│   Queue   │ • Redis       │ • OpenAI API   │ • Redis    │
│ • Worker  │ • File System │ • Docker       │            │
│   Process │               │                │            │
└─────────────────────────────────────────────────────────────┘
```

### 2. Job Data as Application DTOs

Job data should be treated as **Application Layer DTOs**:

```typescript
// lib/application/dtos/JobData.ts
import { z } from "zod"

// ✅ Job request DTOs (what gets queued)
export const AutoResolveIssueJobDataSchema = z.object({
  issueNumber: z.number().int().positive(),
  repoFullName: z.string().regex(/^[^/]+\/[^/]+$/),
  jobId: z.string().uuid(),
  apiKey: z.string().min(1),
  options: z
    .object({
      createPR: z.boolean().default(true),
      postToGitHub: z.boolean().default(false),
      maxAttempts: z.number().int().min(1).max(5).default(3),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    })
    .default({}),
})

export const CommentOnIssueJobDataSchema = z.object({
  issueNumber: z.number().int().positive(),
  repoFullName: z.string().regex(/^[^/]+\/[^/]+$/),
  jobId: z.string().uuid(),
  apiKey: z.string().min(1),
  postToGithub: z.boolean().default(false),
})

// ✅ Job result DTOs (what workers return)
export const JobResultSchema = z.object({
  success: z.boolean(),
  jobId: z.string().uuid(),
  issueNumber: z.number().int().positive(),
  repoFullName: z.string(),
  artifacts: z
    .object({
      pullRequestUrl: z.string().url().optional(),
      branchName: z.string().optional(),
      commitHash: z.string().optional(),
      filesChanged: z.number().int().min(0).optional(),
    })
    .optional(),
  error: z.string().optional(),
  executionTime: z.number().min(0),
  metadata: z.record(z.any()).optional(),
})

export type AutoResolveIssueJobData = z.infer<
  typeof AutoResolveIssueJobDataSchema
>
export type CommentOnIssueJobData = z.infer<typeof CommentOnIssueJobDataSchema>
export type JobResult = z.infer<typeof JobResultSchema>
```

### 3. Worker Service Interface

Define interfaces in the **Application Layer**:

```typescript
// lib/application/services/IJobQueueService.ts
export interface IJobQueueService {
  enqueueAutoResolveIssue(data: AutoResolveIssueJobData): Promise<string>
  enqueueCommentOnIssue(data: CommentOnIssueJobData): Promise<string>
  getJobStatus(jobId: string): Promise<JobStatus>
  cancelJob(jobId: string): Promise<void>
}

export interface JobStatus {
  jobId: string
  status: "pending" | "running" | "completed" | "failed" | "cancelled"
  progress: number
  result?: JobResult
  error?: string
  createdAt: Date
  updatedAt: Date
}
```

### 4. Infrastructure Implementation

Implement the queue service in the **Infrastructure Layer**:

```typescript
// lib/infrastructure/services/BullMQJobQueueService.ts
import { Queue, QueueEvents } from "bullmq"
import {
  IJobQueueService,
  JobStatus,
} from "../../application/services/IJobQueueService"
import {
  AutoResolveIssueJobData,
  CommentOnIssueJobData,
  AutoResolveIssueJobDataSchema,
  CommentOnIssueJobDataSchema,
} from "../../application/dtos/JobData"

export class BullMQJobQueueService implements IJobQueueService {
  private autoResolveQueue: Queue
  private commentQueue: Queue
  private events: QueueEvents

  constructor(redisConnection: any) {
    this.autoResolveQueue = new Queue("auto-resolve-issue", {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    })

    this.commentQueue = new Queue("comment-on-issue", {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    })

    this.events = new QueueEvents("auto-resolve-issue", {
      connection: redisConnection,
    })
  }

  async enqueueAutoResolveIssue(
    data: AutoResolveIssueJobData
  ): Promise<string> {
    // ✅ Validate job data before queuing
    const validatedData = AutoResolveIssueJobDataSchema.parse(data)

    const job = await this.autoResolveQueue.add("auto-resolve", validatedData, {
      jobId: validatedData.jobId,
      priority: this.getPriority(validatedData.options.priority),
    })

    return job.id as string
  }

  async enqueueCommentOnIssue(data: CommentOnIssueJobData): Promise<string> {
    // ✅ Validate job data before queuing
    const validatedData = CommentOnIssueJobDataSchema.parse(data)

    const job = await this.commentQueue.add("comment", validatedData, {
      jobId: validatedData.jobId,
    })

    return job.id as string
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    // Get job from queue
    const job =
      (await this.autoResolveQueue.getJob(jobId)) ||
      (await this.commentQueue.getJob(jobId))

    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    const progress = await job.progress()
    const state = await job.getState()

    return {
      jobId,
      status: this.mapJobState(state),
      progress,
      result: job.returnvalue,
      error: job.failedReason,
      createdAt: job.timestamp ? new Date(job.timestamp) : new Date(),
      updatedAt: new Date(),
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    const job =
      (await this.autoResolveQueue.getJob(jobId)) ||
      (await this.commentQueue.getJob(jobId))

    if (job) {
      await job.remove()
    }
  }

  private getPriority(priority: string): number {
    const priorities = {
      low: 10,
      normal: 5,
      high: 1,
      urgent: 0,
    }
    return priorities[priority as keyof typeof priorities] || 5
  }

  private mapJobState(state: string): JobStatus["status"] {
    const stateMap = {
      active: "running",
      completed: "completed",
      failed: "failed",
      delayed: "pending",
      waiting: "pending",
      paused: "pending",
      stuck: "failed",
    }
    return stateMap[state as keyof typeof stateMap] || "pending"
  }
}
```

### 5. Worker Process Implementation

The worker process should use the same use cases as the main application:

```typescript
// services/worker/src/jobs/autoResolveIssue.ts
import { Job } from "bullmq"
import { AutoResolveIssueJobData, JobResultSchema } from "shared"
import { AutoResolveIssueUseCase } from "../../../lib/application/usecases/AutoResolveIssueUseCase"
import { Neo4jIssueRepository } from "../../../lib/infrastructure/repositories/Neo4jIssueRepository"
import { GitHubPermissionService } from "../../../lib/infrastructure/services/GitHubPermissionService"
import { WorkflowOrchestrator } from "../../../lib/infrastructure/services/WorkflowOrchestrator"
import { EventPublisher } from "../../../lib/infrastructure/services/EventPublisher"

export async function processAutoResolveIssue(
  job: Job<AutoResolveIssueJobData>
) {
  const { issueNumber, repoFullName, jobId, apiKey, options } = job.data

  try {
    console.log(`[Worker] Starting autoResolveIssue job ${jobId}`)

    // ✅ Use the same use case as the main application
    const useCase = new AutoResolveIssueUseCase(
      new Neo4jIssueRepository(),
      new GitHubPermissionService(),
      new WorkflowOrchestrator(),
      new EventPublisher()
    )

    // ✅ Validate input using the same schema
    const request = {
      issueNumber,
      repoFullName,
      jobId,
      options,
    }

    // ✅ Execute the same business logic
    const result = await useCase.execute(request)

    // ✅ Update progress
    await job.updateProgress(100)

    // ✅ Validate and return result
    const validatedResult = JobResultSchema.parse({
      success: true,
      jobId,
      issueNumber,
      repoFullName,
      artifacts: result.artifacts,
      executionTime: Date.now() - job.timestamp,
      metadata: {
        priority: options.priority,
        maxAttempts: options.maxAttempts,
      },
    })

    console.log(`[Worker] Successfully completed job ${jobId}`)
    return validatedResult
  } catch (error) {
    console.error(`[Worker] Failed to process job ${jobId}:`, error)

    // ✅ Return structured error result
    const errorResult = JobResultSchema.parse({
      success: false,
      jobId,
      issueNumber,
      repoFullName,
      error: error instanceof Error ? error.message : String(error),
      executionTime: Date.now() - job.timestamp,
    })

    throw error // Re-throw to mark job as failed
  }
}
```

### 6. Updated Use Case for Queue Integration

Modify the use case to support both immediate and queued execution:

```typescript
// lib/application/usecases/AutoResolveIssueUseCase.ts
export class AutoResolveIssueUseCase {
  constructor(
    private readonly issueRepository: IIssueRepository,
    private readonly permissionService: IPermissionService,
    private readonly workflowOrchestrator: IWorkflowOrchestrator,
    private readonly eventPublisher: IEventPublisher,
    private readonly jobQueueService?: IJobQueueService // Optional for queuing
  ) {}

  async execute(
    request: AutoResolveIssueRequest
  ): Promise<AutoResolveIssueResponse> {
    // ✅ Validate input
    const validatedRequest = AutoResolveIssueRequestSchema.parse(request)

    // ✅ Check if we should queue or execute immediately
    if (this.shouldQueue(validatedRequest)) {
      return this.queueExecution(validatedRequest)
    }

    return this.executeImmediately(validatedRequest)
  }

  private shouldQueue(request: AutoResolveIssueRequest): boolean {
    // Queue if:
    // - High priority (urgent)
    // - Complex workflow
    // - System under load
    return request.options.priority === "urgent" || this.isSystemUnderLoad()
  }

  private async queueExecution(
    request: AutoResolveIssueRequest
  ): Promise<AutoResolveIssueResponse> {
    if (!this.jobQueueService) {
      throw new Error("Job queue service not available")
    }

    // ✅ Create job data
    const jobData: AutoResolveIssueJobData = {
      issueNumber: request.issueNumber,
      repoFullName: request.repoFullName,
      jobId: request.jobId,
      apiKey: await this.getApiKey(),
      options: request.options,
    }

    // ✅ Queue the job
    await this.jobQueueService.enqueueAutoResolveIssue(jobData)

    // ✅ Publish event
    await this.eventPublisher.publish({
      type: "AutoResolutionQueued",
      jobId: request.jobId,
      issueNumber: request.issueNumber,
      repoFullName: request.repoFullName,
      timestamp: new Date(),
    })

    return new AutoResolveIssueResponse(
      request.jobId,
      request.issueNumber,
      "queued"
    )
  }

  private async executeImmediately(
    request: AutoResolveIssueRequest
  ): Promise<AutoResolveIssueResponse> {
    // ✅ Original synchronous execution logic
    await this.validateApplicationRules(request)

    const issue = await this.getAndValidateIssue(request)
    this.validateBusinessRules(issue)

    await this.workflowOrchestrator.startAutoResolution(issue, request.jobId)

    return new AutoResolveIssueResponse(
      request.jobId,
      request.issueNumber,
      "started"
    )
  }

  private async isSystemUnderLoad(): Promise<boolean> {
    // Check system metrics, queue length, etc.
    return false // Simplified
  }

  private async getApiKey(): Promise<string> {
    // Get API key from settings or environment
    return process.env.OPENAI_API_KEY || ""
  }
}
```

### 7. Updated API Route

The API route now supports both immediate and queued execution:

```typescript
// app/api/workflow/autoResolveIssue/route.ts
import { BullMQJobQueueService } from "@/lib/infrastructure/services/BullMQJobQueueService"
import { AutoResolveIssueUseCase } from "@/lib/application/usecases/AutoResolveIssueUseCase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // ✅ Create dependencies
    const jobQueueService = new BullMQJobQueueService(redisConnection)
    const useCase = new AutoResolveIssueUseCase(
      new Neo4jIssueRepository(),
      new GitHubPermissionService(),
      new WorkflowOrchestrator(),
      new EventPublisher(),
      jobQueueService // Pass queue service
    )

    const result = await useCase.execute(body)

    return NextResponse.json(result)
  } catch (error) {
    // ... error handling
  }
}
```

## Worker Configuration in Clean Architecture

### Docker Compose Structure

```yaml
# docker-compose.yml
services:
  # Application Layer
  nextjs-app:
    build: .
    environment:
      - REDIS_URL=redis://redis:6379
      - NEO4J_URI=bolt://neo4j:7687
    depends_on:
      - redis
      - neo4j

  # Infrastructure Layer - Workers
  auto-resolve-worker:
    build:
      context: .
      dockerfile: services/worker/Dockerfile
    environment:
      - REDIS_URL=redis://redis:6379
      - NEO4J_URI=bolt://neo4j:7687
      - WORKER_TYPE=auto-resolve
    depends_on:
      - redis
      - neo4j
    restart: unless-stopped

  comment-worker:
    build:
      context: .
      dockerfile: services/worker/Dockerfile
    environment:
      - REDIS_URL=redis://redis:6379
      - NEO4J_URI=bolt://neo4j:7687
      - WORKER_TYPE=comment
    depends_on:
      - redis
      - neo4j
    restart: unless-stopped

  # Infrastructure Layer - External Services
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  neo4j:
    image: neo4j:latest
    environment:
      - NEO4J_AUTH=neo4j/password
    ports:
      - "7474:7474"
      - "7687:7687"
```

### Worker Process Entry Point

```typescript
// services/worker/src/index.ts
import { Worker } from "bullmq"
import { getSharedRedisClient } from "shared"

async function startWorker() {
  const workerType = process.env.WORKER_TYPE || "auto-resolve"
  const redisConnection = await getSharedRedisClient()

  console.log(`[Worker] Starting ${workerType} worker...`)

  if (workerType === "auto-resolve") {
    const worker = new Worker("auto-resolve-issue", processAutoResolveIssue, {
      connection: redisConnection,
      concurrency: 1, // Resource intensive
    })

    worker.on("completed", (job) => {
      console.log(`[Worker] Auto-resolve job ${job.id} completed`)
    })

    worker.on("failed", (job, err) => {
      console.error(`[Worker] Auto-resolve job ${job.id} failed:`, err)
    })
  }

  if (workerType === "comment") {
    const worker = new Worker("comment-on-issue", processCommentOnIssue, {
      connection: redisConnection,
      concurrency: 3, // Faster processing
    })

    worker.on("completed", (job) => {
      console.log(`[Worker] Comment job ${job.id} completed`)
    })

    worker.on("failed", (job, err) => {
      console.error(`[Worker] Comment job ${job.id} failed:`, err)
    })
  }
}

startWorker().catch(console.error)
```

## Benefits of This Architecture

### ✅ **Consistent Business Logic**

- Same use cases run in both app and worker
- No code duplication between sync/async execution
- Business rules enforced consistently

### ✅ **Type Safety**

- Zod schemas validate job data at runtime
- TypeScript types generated automatically
- Compile-time safety across all layers

### ✅ **Scalability**

- Workers can be scaled independently
- Different worker types for different workloads
- Queue-based load balancing

### ✅ **Monitoring & Observability**

- Structured job data with validation
- Consistent error handling
- Progress tracking and metrics

### ✅ **Clean Separation**

- Workers belong to infrastructure layer
- Job data treated as application DTOs
- Business logic stays in domain/application layers

## Migration Strategy

1. **Start with Job Data**: Add Zod schemas for job data
2. **Create Queue Service**: Implement `IJobQueueService` interface
3. **Update Use Cases**: Add queue support to existing use cases
4. **Deploy Workers**: Scale worker processes independently
5. **Add Monitoring**: Track job progress and system health

This approach ensures your workers follow clean architecture principles while providing the scalability and reliability needed for background job processing!
