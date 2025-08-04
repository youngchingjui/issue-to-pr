// EXAMPLE: Application DTOs with Zod (following clean architecture)
// This shows how to use Zod for application-layer validation and DTOs

import { z } from "zod"
import { IssueStateSchema } from "../../domain/entities/Issue.zod-example"

// ✅ Input validation schema with application-level rules
export const AutoResolveIssueRequestSchema = z
  .object({
    issueNumber: z
      .number()
      .int("Issue number must be an integer")
      .positive("Issue number must be positive")
      .max(999999, "Issue number seems too large"),

    repoFullName: z
      .string()
      .min(1, "Repository name is required")
      .regex(
        /^[a-zA-Z0-9\-_.]+\/[a-zA-Z0-9\-_.]+$/,
        "Repository must be in format 'owner/repo'"
      )
      .transform((val) => val.toLowerCase()) // Normalize to lowercase
      .refine(
        (val) => !val.includes(".."),
        "Repository name cannot contain consecutive dots"
      ),

    jobId: z
      .string()
      .uuid("Job ID must be a valid UUID")
      .or(
        z
          .string()
          .length(0)
          .transform(() => crypto.randomUUID())
      ), // Auto-generate if empty

    // ✅ Nested options with defaults and validation
    options: z
      .object({
        createPR: z.boolean().default(true),

        postToGitHub: z.boolean().default(false),

        maxAttempts: z
          .number()
          .int()
          .min(1, "Must have at least 1 attempt")
          .max(5, "Cannot exceed 5 attempts")
          .default(3),

        priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),

        timeout: z
          .number()
          .int()
          .min(60, "Timeout must be at least 60 seconds")
          .max(3600, "Timeout cannot exceed 1 hour")
          .default(1800), // 30 minutes

        tags: z
          .array(z.string().min(1))
          .max(5, "Cannot have more than 5 tags")
          .default([])
          .transform((tags) => [...new Set(tags)]), // Remove duplicates
      })
      .default({}), // Entire options object is optional
  })
  .refine(async (data) => {
    // ✅ Application-level async validation
    // This could check permissions, rate limits, etc.
    if (data.options.priority === "urgent" && data.options.maxAttempts > 3) {
      return false
    }
    return true
  }, "Urgent priority requests cannot have more than 3 attempts")

// ✅ Response schema with computed fields
export const AutoResolveIssueResponseSchema = z
  .object({
    jobId: z.string().uuid(),

    issueNumber: z.number().int().positive(),

    status: z.enum(["started", "queued", "error", "rate_limited"]),

    message: z.string().optional(),

    estimatedCompletionTime: z
      .date()
      .optional()
      .refine(
        (date) => !date || date > new Date(),
        "Estimated completion time must be in the future"
      ),

    // ✅ Computed fields based on request
    metadata: z.object({
      priority: z.enum(["low", "normal", "high", "urgent"]),
      maxAttempts: z.number().int().min(1).max(5),
      tags: z.array(z.string()),
      createdAt: z.date().default(() => new Date()),
      expiresAt: z.date(), // Computed based on timeout
    }),

    // ✅ Links for HATEOAS-style API
    _links: z
      .object({
        self: z.string().url(),
        status: z.string().url(),
        cancel: z.string().url().optional(),
      })
      .optional(),
  })
  .transform((data) => {
    // ✅ Post-validation transformation
    return {
      ...data,
      // Ensure message has a default value
      message:
        data.message ||
        `Auto-resolution started for issue #${data.issueNumber}`,
    }
  })

// ✅ Workflow status schema with detailed progress tracking
export const WorkflowStatusSchema = z
  .object({
    jobId: z.string().uuid(),

    status: z.enum([
      "pending",
      "initializing",
      "analyzing",
      "planning",
      "implementing",
      "testing",
      "creating_pr",
      "completed",
      "failed",
      "cancelled",
    ]),

    progress: z
      .number()
      .min(0)
      .max(100)
      .int("Progress must be an integer percentage"),

    currentStep: z.string().optional(),

    steps: z
      .array(
        z.object({
          name: z.string(),
          status: z.enum([
            "pending",
            "running",
            "completed",
            "failed",
            "skipped",
          ]),
          startTime: z.date().optional(),
          endTime: z.date().optional(),
          error: z.string().optional(),
          artifacts: z.array(z.string()).default([]),
        })
      )
      .default([]),

    error: z.string().optional(),

    startTime: z.date(),

    endTime: z
      .date()
      .optional()
      .refine((endTime, ctx) => {
        if (endTime && endTime <= ctx.parent.startTime) {
          return false
        }
        return true
      }, "End time must be after start time"),

    // ✅ Rich artifacts with validation
    artifacts: z
      .object({
        pullRequestUrl: z.string().url().optional(),
        branchName: z
          .string()
          .regex(/^[a-zA-Z0-9\-_/]+$/, "Invalid branch name format")
          .optional(),
        commitHash: z
          .string()
          .regex(/^[a-f0-9]{40}$/, "Commit hash must be 40 hex characters")
          .optional(),
        changedFiles: z.array(z.string()).default([]),
        testResults: z
          .object({
            passed: z.number().int().min(0),
            failed: z.number().int().min(0),
            coverage: z.number().min(0).max(100).optional(),
          })
          .optional(),
      })
      .default({}),

    // ✅ Performance metrics
    metrics: z
      .object({
        executionTime: z.number().min(0), // seconds
        apiCalls: z.number().int().min(0),
        linesOfCodeChanged: z.number().int().min(0),
        complexity: z.number().min(0).max(10),
      })
      .optional(),
  })
  .refine((data) => {
    // ✅ Cross-field validation
    if (data.status === "completed" && !data.endTime) {
      return false
    }
    if (data.status === "failed" && !data.error) {
      return false
    }
    return true
  }, "Status and related fields must be consistent")

// ✅ Event schemas for inter-layer communication
export const AutoResolutionEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("started"),
    jobId: z.string().uuid(),
    issueNumber: z.number().int().positive(),
    repoFullName: z.string(),
    priority: z.enum(["low", "normal", "high", "urgent"]),
    timestamp: z.date(),
  }),

  z.object({
    type: z.literal("progress"),
    jobId: z.string().uuid(),
    progress: z.number().min(0).max(100),
    currentStep: z.string(),
    timestamp: z.date(),
  }),

  z.object({
    type: z.literal("completed"),
    jobId: z.string().uuid(),
    result: z.object({
      success: z.boolean(),
      pullRequestUrl: z.string().url().optional(),
      branchName: z.string().optional(),
      filesChanged: z.number().int().min(0),
      executionTime: z.number().min(0),
    }),
    timestamp: z.date(),
  }),

  z.object({
    type: z.literal("failed"),
    jobId: z.string().uuid(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.any()).optional(),
      retryable: z.boolean(),
    }),
    timestamp: z.date(),
  }),
])

// ✅ Utility schemas for common patterns
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
})

export const FilterSchema = z.object({
  status: z
    .array(z.enum(["pending", "running", "completed", "failed"]))
    .optional(),
  priority: z.array(z.enum(["low", "normal", "high", "urgent"])).optional(),
  dateRange: z
    .object({
      from: z.date(),
      to: z.date(),
    })
    .refine((data) => data.to > data.from, "End date must be after start date")
    .optional(),
  repoFullName: z.string().optional(),
})

// ✅ Type exports using Zod inference
export type AutoResolveIssueRequest = z.infer<
  typeof AutoResolveIssueRequestSchema
>
export type AutoResolveIssueResponse = z.infer<
  typeof AutoResolveIssueResponseSchema
>
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>
export type AutoResolutionEvent = z.infer<typeof AutoResolutionEventSchema>
export type PaginationParams = z.infer<typeof PaginationSchema>
export type FilterParams = z.infer<typeof FilterSchema>

// ✅ Utility functions for common validation patterns
export const createRequestValidator = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown): T => {
    const result = schema.safeParse(data)

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
        code: e.code,
      }))

      throw new ValidationError("Request validation failed", errors)
    }

    return result.data
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: Array<{
      field: string
      message: string
      code: string
    }>
  ) {
    super(message)
    this.name = "ValidationError"
  }
}
