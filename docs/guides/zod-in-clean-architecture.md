# Zod in Clean Architecture

## Overview

Zod is an excellent tool for runtime validation and type inference that can be used across all layers of clean architecture. The key is to use it appropriately at each layer level while maintaining separation of concerns.

## Zod Usage by Layer

### Domain Layer - Business Rules Validation

In the domain layer, Zod validates **business rules** and **invariants**:

```typescript
// lib/domain/entities/Issue.ts
import { z } from "zod"

// ✅ Domain-level validation schemas
const IssueStateSchema = z.enum(["open", "closed", "draft"])

const BusinessRulesSchema = z.object({
  title: z
    .string()
    .min(5, "Issue title must be at least 5 characters")
    .max(100, "Issue title cannot exceed 100 characters")
    .refine(
      (title) => !title.toLowerCase().includes("test"),
      "Production issues cannot contain 'test' in title"
    ),
  body: z
    .string()
    .min(10, "Issue description must be at least 10 characters")
    .refine((body) => {
      // Business rule: Issue must have clear problem statement
      const hasWhatSection = body.toLowerCase().includes("what")
      const hasExpectedSection = body.toLowerCase().includes("expected")
      return hasWhatSection && hasExpectedSection
    }, "Issue must describe what happened and what was expected"),
  labels: z
    .array(z.string())
    .max(10, "Cannot have more than 10 labels")
    .refine((labels) => {
      // Business rule: Cannot have conflicting priority labels
      const priorityLabels = labels.filter((l) =>
        l.startsWith("priority:")
      ).length
      return priorityLabels <= 1
    }, "Cannot have multiple priority labels"),
})

export class Issue {
  constructor(
    public readonly number: number,
    public readonly title: string,
    public readonly body: string,
    public readonly repoFullName: string,
    private _state: z.infer<typeof IssueStateSchema>,
    private _labels: string[] = []
  ) {
    // ✅ Validate business rules on construction
    this.validateBusinessRules()
  }

  // ✅ Business rule validation
  private validateBusinessRules(): void {
    const result = BusinessRulesSchema.safeParse({
      title: this.title,
      body: this.body,
      labels: this._labels,
    })

    if (!result.success) {
      throw new Error(`Invalid issue: ${result.error.message}`)
    }
  }

  // ✅ Domain methods use validated data
  canBeAutoResolved(): boolean {
    // This method can trust that business rules are valid
    return (
      this._state === "open" &&
      this.hasComplexityScore() < 5 &&
      !this.hasBlockingLabels()
    )
  }

  updateLabels(newLabels: string[]): void {
    // ✅ Validate before updating
    const result = BusinessRulesSchema.pick({ labels: true }).safeParse({
      labels: newLabels,
    })

    if (!result.success) {
      throw new Error(`Invalid labels: ${result.error.message}`)
    }

    this._labels = newLabels
  }
}

// ✅ Export schemas for use in other layers
export { IssueStateSchema, BusinessRulesSchema }
```

### Application Layer - DTOs and Use Case Validation

In the application layer, Zod validates **input/output contracts** and **application rules**:

```typescript
// lib/application/dtos/AutoResolveIssue.ts
import { z } from "zod"
import { IssueStateSchema } from "../../domain/entities/Issue"

// ✅ Request DTO schema with application-level validation
export const AutoResolveIssueRequestSchema = z.object({
  issueNumber: z.number().int().positive("Issue number must be positive"),
  repoFullName: z
    .string()
    .regex(/^[a-zA-Z0-9\-_.]+\/[a-zA-Z0-9\-_.]+$/, "Invalid repository format")
    .transform((val) => val.toLowerCase()), // Normalize input
  jobId: z.string().uuid("Job ID must be a valid UUID"),
  options: z
    .object({
      createPR: z.boolean().default(true),
      postToGitHub: z.boolean().default(false),
      maxAttempts: z.number().int().min(1).max(5).default(3),
      priority: z.enum(["low", "normal", "high"]).default("normal"),
    })
    .optional(),
})

// ✅ Response DTO schema
export const AutoResolveIssueResponseSchema = z.object({
  jobId: z.string().uuid(),
  issueNumber: z.number().int().positive(),
  status: z.enum(["started", "queued", "error"]),
  message: z.string().optional(),
  estimatedCompletionTime: z.date().optional(),
})

// ✅ Infer types from schemas
export type AutoResolveIssueRequest = z.infer<
  typeof AutoResolveIssueRequestSchema
>
export type AutoResolveIssueResponse = z.infer<
  typeof AutoResolveIssueResponseSchema
>

// ✅ Application-specific validation schemas
export const WorkflowStatusSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  progress: z.number().min(0).max(100),
  currentStep: z.string().optional(),
  error: z.string().optional(),
  startTime: z.date(),
  endTime: z.date().optional(),
  artifacts: z
    .object({
      pullRequestUrl: z.string().url().optional(),
      branchName: z.string().optional(),
      commitHash: z
        .string()
        .regex(/^[a-f0-9]{40}$/)
        .optional(),
    })
    .optional(),
})
```

```typescript
// lib/application/usecases/AutoResolveIssueUseCase.ts
import { z } from "zod"
import {
  AutoResolveIssueRequestSchema,
  AutoResolveIssueResponseSchema,
} from "../dtos/AutoResolveIssue"

export class AutoResolveIssueUseCase {
  async execute(rawRequest: unknown): Promise<AutoResolveIssueResponse> {
    // ✅ Validate input at application boundary
    const request = AutoResolveIssueRequestSchema.parse(rawRequest)

    // ✅ Application-level business rules
    await this.validateApplicationRules(request)

    // ... rest of use case logic

    // ✅ Validate output before returning
    const response = {
      jobId: request.jobId,
      issueNumber: request.issueNumber,
      status: "started" as const,
      estimatedCompletionTime: new Date(Date.now() + 300000), // 5 minutes
    }

    return AutoResolveIssueResponseSchema.parse(response)
  }

  private async validateApplicationRules(
    request: AutoResolveIssueRequest
  ): Promise<void> {
    // ✅ Application-specific validation that might require external services
    const RepoAccessSchema = z.object({
      repoFullName: z.string().refine(async (repo) => {
        const hasAccess = await this.permissionService.checkRepoAccess(repo)
        return hasAccess
      }, "User does not have access to this repository"),
    })

    await RepoAccessSchema.parseAsync({ repoFullName: request.repoFullName })
  }
}
```

### Infrastructure Layer - External Data Validation

In the infrastructure layer, Zod validates **external data** and **API contracts**:

```typescript
// lib/infrastructure/clients/github/schemas.ts
import { z } from "zod"

// ✅ External API response schemas
export const GitHubIssueApiSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z
    .string()
    .nullable()
    .transform((val) => val ?? ""),
  state: z.enum(["open", "closed"]),
  labels: z.array(
    z.object({
      name: z.string(),
      color: z.string(),
    })
  ),
  user: z
    .object({
      login: z.string(),
      id: z.number(),
    })
    .nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  assignees: z.array(
    z.object({
      login: z.string(),
    })
  ),
})

// ✅ Database schemas
export const Neo4jIssueNodeSchema = z.object({
  id: z.string(),
  number: z.number(),
  title: z.string(),
  body: z.string(),
  state: z.string(),
  repoFullName: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type GitHubIssueApi = z.infer<typeof GitHubIssueApiSchema>
export type Neo4jIssueNode = z.infer<typeof Neo4jIssueNodeSchema>
```

```typescript
// lib/infrastructure/repositories/Neo4jIssueRepository.ts
import { Issue } from "../../domain/entities/Issue"
import { Neo4jIssueNodeSchema } from "../clients/github/schemas"

export class Neo4jIssueRepository implements IIssueRepository {
  async getByNumber(issueNumber: number, repoFullName: string): Promise<Issue> {
    const result = await this.neo4jClient.run(
      "MATCH (i:Issue {number: $number, repoFullName: $repo}) RETURN i",
      { number: issueNumber, repo: repoFullName }
    )

    if (!result.records.length) {
      throw new Error(`Issue #${issueNumber} not found`)
    }

    // ✅ Validate data from external source (database)
    const rawData = result.records[0].get("i").properties
    const validatedData = Neo4jIssueNodeSchema.parse(rawData)

    // ✅ Convert to domain entity
    return new Issue(
      validatedData.number,
      validatedData.title,
      validatedData.body,
      validatedData.repoFullName,
      validatedData.state as "open" | "closed"
    )
  }

  async save(issue: Issue): Promise<void> {
    // ✅ Validate data before saving
    const nodeData = Neo4jIssueNodeSchema.parse({
      id: generateId(),
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      repoFullName: issue.repoFullName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    await this.neo4jClient.run(
      "MERGE (i:Issue {number: $number, repoFullName: $repo}) SET i += $data",
      { number: issue.number, repo: issue.repoFullName, data: nodeData }
    )
  }
}
```

### Presentation Layer - API and Component Validation

In the presentation layer, Zod validates **user input** and **API contracts**:

```typescript
// app/api/workflow/autoResolveIssue/route.ts
import { NextRequest, NextResponse } from "next/server"
import { AutoResolveIssueRequestSchema } from "@/lib/application/dtos/AutoResolveIssue"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // ✅ Validate request at API boundary
    const validatedRequest = AutoResolveIssueRequestSchema.parse(body)

    const useCase = container.get<AutoResolveIssueUseCase>("AutoResolveUseCase")
    const result = await useCase.execute(validatedRequest)

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

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

```typescript
// components/issues/controllers/AutoResolveIssueController.tsx
import { AutoResolveIssueRequestSchema } from "@/lib/application/dtos/AutoResolveIssue"

export default function AutoResolveIssueController({
  issueNumber,
  repoFullName,
}: Props) {
  const execute = async () => {
    try {
      // ✅ Validate client-side data before sending
      const request = AutoResolveIssueRequestSchema.parse({
        issueNumber,
        repoFullName,
        jobId: crypto.randomUUID(),
        options: {
          createPR: true,
          postToGitHub: false,
        },
      })

      const response = await fetch("/api/workflow/autoResolveIssue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(
          error.details?.map((d) => d.message).join(", ") || error.error
        )
      }

      // ✅ Validate response
      const result = AutoResolveIssueResponseSchema.parse(await response.json())

      toast.success(`Workflow started: ${result.jobId}`)
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(
          `Invalid data: ${error.errors.map((e) => e.message).join(", ")}`
        )
      } else {
        toast.error(error.message)
      }
    }
  }

  return { execute }
}
```

## Zod Design Patterns

### Pattern 1: Schema Composition

```typescript
// Shared base schemas
const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Compose schemas across layers
const DomainIssueSchema = BaseEntitySchema.extend({
  number: z.number().int().positive(),
  title: z.string().min(1).max(100),
  body: z.string(),
})

const ApiIssueSchema = DomainIssueSchema.extend({
  _links: z.object({
    self: z.string().url(),
    repository: z.string().url(),
  }),
})
```

### Pattern 2: Transformation Pipelines

```typescript
// Clean and normalize data through layers
const InputSchema = z.object({
  title: z
    .string()
    .trim() // Remove whitespace
    .toLowerCase() // Normalize case
    .transform((val) => val.charAt(0).toUpperCase() + val.slice(1)), // Capitalize
})
```

### Pattern 3: Conditional Validation

```typescript
const IssueSchema = z
  .object({
    state: z.enum(["open", "closed"]),
    assignee: z.string().optional(),
    closedAt: z.date().optional(),
  })
  .refine((data) => {
    if (data.state === "closed") {
      return data.assignee && data.closedAt
    }
    return true
  }, "Closed issues must have assignee and closed date")
```

### Pattern 4: Layer-Specific Validation

```typescript
// lib/shared/schemas/layers.ts
export const createLayeredValidation = <T>(baseSchema: z.ZodSchema<T>) => ({
  // Domain layer: business rules only
  domain: baseSchema,

  // Application layer: add application constraints
  application: baseSchema.refine(async (data) => {
    // Application-specific async validation
    return await checkApplicationRules(data)
  }),

  // Infrastructure layer: add external constraints
  infrastructure: baseSchema.transform((data) => {
    // Add infrastructure metadata
    return { ...data, _metadata: { source: "database" } }
  }),

  // Presentation layer: add UI constraints
  presentation: baseSchema.extend({
    _ui: z
      .object({
        errors: z.array(z.string()).default([]),
        touched: z.boolean().default(false),
      })
      .optional(),
  }),
})
```

## Guidelines for Zod in Clean Architecture

### ✅ Best Practices

1. **Validate at Boundaries**: Always validate data entering/leaving a layer
2. **Business Rules in Domain**: Put domain validation in entities
3. **Application Rules in Use Cases**: Validate application constraints in use cases
4. **Transform Early**: Clean/normalize data as early as possible
5. **Fail Fast**: Validate input before processing
6. **Type Safety**: Use `z.infer<>` for automatic type generation
7. **Reuse Schemas**: Compose and extend schemas across layers

### ❌ Anti-Patterns

1. **Don't Mix Concerns**: Don't put UI validation in domain schemas
2. **Don't Skip Validation**: Always validate external data
3. **Don't Validate Too Late**: Validate at layer boundaries, not deep inside
4. **Don't Ignore Errors**: Handle validation errors appropriately
5. **Don't Over-Validate**: Don't validate the same data multiple times unnecessarily

## Migration Strategy

### Recommended Steps

1. **Start with DTOs**: Add Zod to application layer DTOs first
2. **Add API Validation**: Validate requests/responses in API routes
3. **Extract Domain Rules**: Move business validation to domain entities
4. **Add Infrastructure Validation**: Validate external data sources
5. **Enhance with Transforms**: Add data cleaning and normalization

### Practical Implementation

For a detailed, step-by-step example of migrating existing code to use Zod across all architectural layers, see:

**[📋 Zod Migration Example: Step-by-Step](./zod-migration-example.md)**

This guide shows how to:

- Migrate from manual validation to Zod schemas
- Incrementally add validation without breaking changes
- Maintain clean architecture while adding type safety
- Handle errors consistently across layers

## Key Benefits

✅ **Runtime Type Safety**: Catch type errors at runtime, not just compile time  
✅ **Automatic TypeScript Types**: Generate types from schemas with `z.infer<>`  
✅ **Consistent Validation**: Same validation logic across all layers  
✅ **Better Error Messages**: Detailed validation errors with field paths  
✅ **Self-Documenting**: Schemas serve as living documentation  
✅ **Data Transformation**: Clean and normalize data as it flows through layers

This approach gives you type safety, runtime validation, and clear separation of concerns while leveraging Zod's full power across your architecture!
