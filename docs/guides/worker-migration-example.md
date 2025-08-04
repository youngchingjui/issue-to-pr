# Worker Migration Example: From Current to Clean Architecture

This document shows how to migrate your existing worker setup to follow clean architecture principles while maintaining functionality.

## Current State Analysis

Your current worker setup has:

```typescript
// services/worker/src/jobs/autoResolveIssue.ts (CURRENT)
export async function processAutoResolveIssue(
  job: Job<AutoResolveIssueJobData>
) {
  const { issueNumber, repoFullName, jobId } = job.data

  try {
    console.log(`[Worker] Starting autoResolveIssue job ${jobId}`)
    await job.updateProgress(10)

    // ❌ Direct workflow call - no abstraction
    // TODO: Import and call the actual autoResolveIssue workflow
    console.log(`[Worker] Auto-analyzing issue #${issueNumber}...`)
    await new Promise((resolve) => setTimeout(resolve, 4000))
    await job.updateProgress(30)

    console.log(`[Worker] Generating plan for issue #${issueNumber}...`)
    await new Promise((resolve) => setTimeout(resolve, 3000))
    await job.updateProgress(60)

    console.log(`[Worker] Implementing solution for issue #${issueNumber}...`)
    await new Promise((resolve) => setTimeout(resolve, 5000))
    await job.updateProgress(90)

    console.log(`[Worker] Creating pull request for issue #${issueNumber}...`)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    await job.updateProgress(100)

    return {
      success: true,
      jobId,
      issueNumber,
      repoFullName,
      prCreated: true,
    }
  } catch (error) {
    console.error(
      `[Worker] Failed to auto-resolve issue #${issueNumber}:`,
      error
    )
    throw error
  }
}
```

## Migration Step 1: Create Job Data Schemas

First, move job data schemas to the application layer:

```typescript
// lib/application/dtos/JobData.ts (NEW)
import { z } from "zod"

// ✅ Migrate from services/shared to application layer
export const AutoResolveIssueJobDataSchema = z.object({
  issueNumber: z.number().int().positive("Issue number must be positive"),
  repoFullName: z
    .string()
    .regex(/^[^/]+\/[^/]+$/, "Repository must be in format 'owner/repo'")
    .transform((val) => val.toLowerCase()),
  jobId: z.string().uuid("Job ID must be a valid UUID"),
  apiKey: z.string().min(1, "API key is required"),
  options: z
    .object({
      createPR: z.boolean().default(true),
      postToGitHub: z.boolean().default(false),
      maxAttempts: z.number().int().min(1).max(5).default(3),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    })
    .default({}),
})

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
export type JobResult = z.infer<typeof JobResultSchema>
```

## Migration Step 2: Create Queue Service Interface

Define the interface in the application layer:

```typescript
// lib/application/services/IJobQueueService.ts (NEW)
export interface IJobQueueService {
  enqueueAutoResolveIssue(data: AutoResolveIssueJobData): Promise<string>
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

## Migration Step 3: Implement Infrastructure Queue Service

```typescript
// lib/infrastructure/services/BullMQJobQueueService.ts (NEW)
import { Queue, QueueEvents } from "bullmq"
import {
  IJobQueueService,
  JobStatus,
} from "../../application/services/IJobQueueService"
import {
  AutoResolveIssueJobData,
  AutoResolveIssueJobDataSchema,
} from "../../application/dtos/JobData"

export class BullMQJobQueueService implements IJobQueueService {
  private autoResolveQueue: Queue
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

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const job = await this.autoResolveQueue.getJob(jobId)

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
    const job = await this.autoResolveQueue.getJob(jobId)
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

## Migration Step 4: Update Use Case for Queue Support

```typescript
// lib/application/usecases/AutoResolveIssueUseCase.ts (UPDATED)
export class AutoResolveIssueUseCase {
  constructor(
    private readonly issueRepository: IIssueRepository,
    private readonly permissionService: IPermissionService,
    private readonly workflowOrchestrator: IWorkflowOrchestrator,
    private readonly eventPublisher: IEventPublisher,
    private readonly jobQueueService?: IJobQueueService // ✅ New optional dependency
  ) {}

  async execute(
    request: AutoResolveIssueRequest
  ): Promise<AutoResolveIssueResponse> {
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

    // ✅ Create job data with validation
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
    return process.env.OPENAI_API_KEY || ""
  }
}
```

## Migration Step 5: Update Worker Process

```typescript
// services/worker/src/jobs/autoResolveIssue.ts (AFTER MIGRATION)
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
      // Note: No jobQueueService in worker - we're executing, not queuing
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

## Migration Step 6: Update API Route

```typescript
// app/api/workflow/autoResolveIssue/route.ts (UPDATED)
import { BullMQJobQueueService } from "@/lib/infrastructure/services/BullMQJobQueueService"
import { AutoResolveIssueUseCase } from "@/lib/application/usecases/AutoResolveIssueUseCase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // ✅ Create dependencies with queue service
    const redisConnection = await getSharedRedisClient()
    const jobQueueService = new BullMQJobQueueService(redisConnection)

    const useCase = new AutoResolveIssueUseCase(
      new Neo4jIssueRepository(),
      new GitHubPermissionService(),
      new WorkflowOrchestrator(),
      new EventPublisher(),
      jobQueueService // ✅ Pass queue service
    )

    const result = await useCase.execute(body)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

## Migration Step 7: Update Docker Configuration

```yaml
# docker-compose.yml (UPDATED)
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
      - NODE_ENV=production
    depends_on:
      redis:
        condition: service_healthy
      neo4j:
        condition: service_started
    restart: unless-stopped
    networks:
      - issue-to-pr-network

  comment-worker:
    build:
      context: .
      dockerfile: services/worker/Dockerfile
    environment:
      - REDIS_URL=redis://redis:6379
      - NEO4J_URI=bolt://neo4j:7687
      - WORKER_TYPE=comment
      - NODE_ENV=production
    depends_on:
      redis:
        condition: service_healthy
      neo4j:
        condition: service_started
    restart: unless-stopped
    networks:
      - issue-to-pr-network

  # Infrastructure Layer - External Services
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  neo4j:
    image: neo4j:latest
    environment:
      - NEO4J_AUTH=neo4j/password
    ports:
      - "7474:7474"
      - "7687:7687"
    healthcheck:
      test: ["CMD", "cypher-shell", "-u", "neo4j", "-p", "password", "RETURN 1"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  issue-to-pr-network:
    driver: bridge
```

## Benefits After Migration

### ✅ **Consistent Business Logic**

- Same use case runs in both app and worker
- No code duplication between sync/async execution
- Business rules enforced consistently

### ✅ **Type Safety**

- Zod schemas validate job data at runtime
- TypeScript types generated automatically
- Compile-time safety across all layers

### ✅ **Better Error Handling**

- Structured error results with validation
- Consistent error format across layers
- Detailed error information for debugging

### ✅ **Scalability**

- Workers can be scaled independently
- Queue-based load balancing
- Priority-based job processing

### ✅ **Monitoring & Observability**

- Structured job data with validation
- Progress tracking and metrics
- Consistent logging across layers

## Migration Checklist

- [ ] Create job data schemas in application layer
- [ ] Implement queue service interface
- [ ] Create BullMQ implementation
- [ ] Update use case to support queuing
- [ ] Update worker to use same use case
- [ ] Update API route with queue service
- [ ] Update Docker configuration
- [ ] Test both immediate and queued execution
- [ ] Add monitoring and observability

This migration ensures your workers follow clean architecture principles while maintaining all existing functionality and adding new capabilities like priority queuing and better error handling!
