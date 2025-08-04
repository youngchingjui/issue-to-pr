// EXAMPLE: Use case with Zod validation (following clean architecture)
// This shows how to use Zod in application layer for orchestration and validation

import { z } from "zod"

import { Issue } from "../../domain/entities/Issue.zod-example"
import { IIssueRepository } from "../../domain/repositories/IIssueRepository.template"
import {
  AutoResolveIssueRequest,
  AutoResolveIssueRequestSchema,
  AutoResolveIssueResponse,
  AutoResolveIssueResponseSchema,
  createRequestValidator,
  ValidationError,
} from "../dtos/AutoResolveIssue.zod-example"

// ✅ Application-level validation schemas
const ApplicationRulesSchema = z.object({
  repoFullName: z.string().refine(async (repo) => {
    // This would be injected permission service
    // For example purposes, showing async validation
    return repo.includes("/") && !repo.startsWith("private/")
  }, "Repository access denied or invalid format"),

  issueNumber: z.number().refine(async (issueNum) => {
    // Could check if issue exists, user has access, etc.
    return issueNum > 0 && issueNum < 1000000
  }, "Issue number out of valid range or access denied"),
})

// ✅ Rate limiting schema
const RateLimitSchema = z
  .object({
    userId: z.string().uuid(),
    requestsInLastHour: z.number().int().min(0),
    priorityLevel: z.enum(["low", "normal", "high", "urgent"]),
  })
  .refine((data) => {
    const limits = {
      low: 5,
      normal: 10,
      high: 20,
      urgent: 50,
    }
    return data.requestsInLastHour < limits[data.priorityLevel]
  }, "Rate limit exceeded for current priority level")

// ✅ Interfaces for dependencies (with Zod validation)
interface IPermissionService {
  checkCanResolveIssue(issueNumber: number, repoFullName: string): Promise<void>
  getUserId(): Promise<string>
  getRateLimitInfo(userId: string): Promise<{
    requestsInLastHour: number
    priorityLevel: "low" | "normal" | "high" | "urgent"
  }>
}

interface IWorkflowOrchestrator {
  startAutoResolution(issue: Issue, jobId: string, options: any): Promise<void>
}

interface IEventPublisher {
  publish(event: z.infer<typeof AutoResolutionEventSchema>): Promise<void>
}

// ✅ Use case with comprehensive Zod validation
export class AutoResolveIssueUseCase {
  private readonly validateRequest = createRequestValidator(
    AutoResolveIssueRequestSchema
  )

  constructor(
    private readonly issueRepository: IIssueRepository,
    private readonly permissionService: IPermissionService,
    private readonly workflowOrchestrator: IWorkflowOrchestrator,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(rawRequest: unknown): Promise<AutoResolveIssueResponse> {
    try {
      // ✅ Step 1: Validate and transform input
      const request = this.validateRequest(rawRequest)

      // ✅ Step 2: Application-level validation
      await this.validateApplicationRules(request)

      // ✅ Step 3: Check rate limits
      await this.checkRateLimits(request)

      // ✅ Step 4: Get and validate domain entity
      const issue = await this.getAndValidateIssue(request)

      // ✅ Step 5: Business rule validation using domain entity
      this.validateBusinessRules(issue)

      // ✅ Step 6: Start workflow orchestration
      await this.workflowOrchestrator.startAutoResolution(
        issue,
        request.jobId,
        request.options
      )

      // ✅ Step 7: Publish domain event
      await this.publishStartedEvent(request)

      // ✅ Step 8: Create and validate response
      return this.createValidatedResponse(request)
    } catch (error) {
      // ✅ Enhanced error handling with validation context
      await this.handleError(error, rawRequest)
      throw error
    }
  }

  // ✅ Application-level validation with async rules
  private async validateApplicationRules(
    request: AutoResolveIssueRequest
  ): Promise<void> {
    try {
      await ApplicationRulesSchema.parseAsync({
        repoFullName: request.repoFullName,
        issueNumber: request.issueNumber,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          "Application validation failed",
          error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
            code: e.code,
          }))
        )
      }
      throw error
    }
  }

  // ✅ Rate limiting with Zod validation
  private async checkRateLimits(
    request: AutoResolveIssueRequest
  ): Promise<void> {
    const userId = await this.permissionService.getUserId()
    const rateLimitInfo = await this.permissionService.getRateLimitInfo(userId)

    const rateLimitCheck = RateLimitSchema.safeParse({
      userId,
      ...rateLimitInfo,
      priorityLevel: request.options.priority,
    })

    if (!rateLimitCheck.success) {
      throw new Error(
        `Rate limit exceeded: ${rateLimitCheck.error.errors[0].message}`
      )
    }
  }

  // ✅ Domain entity retrieval with validation
  private async getAndValidateIssue(
    request: AutoResolveIssueRequest
  ): Promise<Issue> {
    // Check permissions first
    await this.permissionService.checkCanResolveIssue(
      request.issueNumber,
      request.repoFullName
    )

    // Get domain entity (repository should validate data internally)
    const issue = await this.issueRepository.getByNumber(
      request.issueNumber,
      request.repoFullName
    )

    // Additional application-level validation
    const IssueAccessSchema = z
      .object({
        repoFullName: z.string(),
        state: z.enum(["open", "closed", "draft"]),
      })
      .refine((data) => {
        // Application rule: Can only auto-resolve open issues
        return data.state === "open"
      }, "Can only auto-resolve open issues")

    IssueAccessSchema.parse({
      repoFullName: issue.repoFullName,
      state: issue.state,
    })

    return issue
  }

  // ✅ Business rule validation using domain entity
  private validateBusinessRules(issue: Issue): void {
    if (!issue.canBeAutoResolved()) {
      throw new Error(
        `Issue #${issue.number} cannot be auto-resolved: ${this.getBusinessRuleViolations(issue)}`
      )
    }
  }

  // ✅ Event publishing with validation
  private async publishStartedEvent(
    request: AutoResolveIssueRequest
  ): Promise<void> {
    const event = {
      type: "started" as const,
      jobId: request.jobId,
      issueNumber: request.issueNumber,
      repoFullName: request.repoFullName,
      priority: request.options.priority,
      timestamp: new Date(),
    }

    // Validate event before publishing
    const AutoResolutionStartedEventSchema = z.object({
      type: z.literal("started"),
      jobId: z.string().uuid(),
      issueNumber: z.number().int().positive(),
      repoFullName: z.string().min(1),
      priority: z.enum(["low", "normal", "high", "urgent"]),
      timestamp: z.date(),
    })

    const validatedEvent = AutoResolutionStartedEventSchema.parse(event)
    await this.eventPublisher.publish(validatedEvent)
  }

  // ✅ Response creation with validation
  private createValidatedResponse(
    request: AutoResolveIssueRequest
  ): AutoResolveIssueResponse {
    const response = {
      jobId: request.jobId,
      issueNumber: request.issueNumber,
      status: "started" as const,
      message: `Auto-resolution started for issue #${request.issueNumber}`,
      estimatedCompletionTime: new Date(
        Date.now() + request.options.timeout * 1000
      ),
      metadata: {
        priority: request.options.priority,
        maxAttempts: request.options.maxAttempts,
        tags: request.options.tags,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + request.options.timeout * 1000),
      },
      _links: {
        self: `/api/workflow/${request.jobId}`,
        status: `/api/workflow/${request.jobId}/status`,
        cancel: `/api/workflow/${request.jobId}/cancel`,
      },
    }

    // Validate response before returning
    return AutoResolveIssueResponseSchema.parse(response)
  }

  // ✅ Enhanced error handling with validation context
  private async handleError(error: any, rawRequest: unknown): Promise<void> {
    const ErrorContextSchema = z.object({
      errorType: z.string(),
      message: z.string(),
      timestamp: z.date(),
      requestData: z.any(),
      userId: z.string().optional(),
    })

    try {
      const userId = await this.permissionService
        .getUserId()
        .catch(() => undefined)

      const errorContext = ErrorContextSchema.parse({
        errorType: error.constructor.name,
        message: error.message,
        timestamp: new Date(),
        requestData: rawRequest,
        userId,
      })

      // Log structured error (could be sent to monitoring service)
      console.error("AutoResolveIssueUseCase Error:", errorContext)
    } catch (loggingError) {
      // Fallback logging if validation fails
      console.error("Error handling failed:", loggingError)
      console.error("Original error:", error)
    }
  }

  // ✅ Helper method for business rule violations
  private getBusinessRuleViolations(issue: Issue): string {
    const violations = []

    if (!issue.isOpen) {
      violations.push("issue is not open")
    }

    if (issue.labels.some((l) => l.includes("manual-only"))) {
      violations.push("issue marked as manual-only")
    }

    if (issue.assignees.length === 0) {
      violations.push("issue has no assignees")
    }

    return violations.join(", ") || "unknown business rule violation"
  }
}

// ✅ Factory function with validation
export const createAutoResolveIssueUseCase = (dependencies: {
  issueRepository: IIssueRepository
  permissionService: IPermissionService
  workflowOrchestrator: IWorkflowOrchestrator
  eventPublisher: IEventPublisher
}): AutoResolveIssueUseCase => {
  // Validate dependencies
  const DependenciesSchema = z.object({
    issueRepository: z.object({}).passthrough(),
    permissionService: z.object({}).passthrough(),
    workflowOrchestrator: z.object({}).passthrough(),
    eventPublisher: z.object({}).passthrough(),
  })

  const validatedDependencies = DependenciesSchema.parse(dependencies)

  return new AutoResolveIssueUseCase(
    validatedDependencies.issueRepository,
    validatedDependencies.permissionService,
    validatedDependencies.workflowOrchestrator,
    validatedDependencies.eventPublisher
  )
}
