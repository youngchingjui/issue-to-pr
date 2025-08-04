# Zod Migration Example: Step-by-Step

This document shows a concrete example of how to incrementally add Zod validation to existing code while following clean architecture principles.

## Current State: Existing Code Without Zod

Let's start with the current `AutoResolveIssueController` and trace through the migration:

### Before: Raw Types and Manual Validation

```typescript
// components/issues/controllers/AutoResolveIssueController.tsx (BEFORE)
interface Props {
  issueNumber: number
  repoFullName: string
  onStart: () => void
  onComplete: () => void
  onError: () => void
}

export default function AutoResolveIssueController({
  issueNumber,
  repoFullName,
  onStart,
  onComplete,
  onError,
}: Props) {
  const execute = async () => {
    try {
      onStart()

      // ❌ Manual validation - error prone
      if (!issueNumber || issueNumber <= 0) {
        throw new Error("Invalid issue number")
      }

      if (!repoFullName || !repoFullName.includes("/")) {
        throw new Error("Invalid repository name")
      }

      // ❌ Raw object - no type safety
      const requestBody = {
        issueNumber,
        repoFullName,
        // ❌ Manual UUID generation
        jobId: Math.random().toString(36),
      }

      const response = await fetch("/api/workflow/autoResolveIssue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error("Failed to start workflow")
      }

      // ❌ No response validation
      const result = await response.json()

      toast.success("Workflow started")
      onComplete()
    } catch (error) {
      toast.error(error.message)
      onError()
    }
  }

  return { execute }
}
```

```typescript
// app/api/workflow/autoResolveIssue/route.ts (BEFORE)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // ❌ No input validation
    const { issueNumber, repoFullName, jobId } = body

    // ❌ Manual validation scattered throughout
    if (!issueNumber || typeof issueNumber !== "number") {
      return NextResponse.json(
        { error: "Invalid issue number" },
        { status: 400 }
      )
    }

    // ❌ Business logic mixed with API handling
    const apiKey = await getUserOpenAIApiKey()
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 })
    }

    // ❌ Direct workflow call - no abstraction
    const repo = await getRepoFromString(repoFullName)
    const issue = await getIssue({ fullName: repoFullName, issueNumber })

    await autoResolveIssue({
      issue: issue.issue,
      repository: repo,
      apiKey,
      jobId,
    })

    // ❌ Inconsistent response format
    return NextResponse.json({ success: true, jobId })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

## Migration Step 1: Add Zod to Presentation Layer

Start by adding Zod validation at the API boundary:

```typescript
// lib/application/dtos/AutoResolveIssue.ts (NEW)
import { z } from "zod"

export const AutoResolveIssueRequestSchema = z.object({
  issueNumber: z.number().int().positive("Issue number must be positive"),
  repoFullName: z
    .string()
    .min(1, "Repository name is required")
    .regex(/^[^/]+\/[^/]+$/, "Repository must be in format 'owner/repo'")
    .transform((val) => val.toLowerCase()),
  jobId: z
    .string()
    .uuid("Job ID must be a valid UUID")
    .or(
      z
        .string()
        .length(0)
        .transform(() => crypto.randomUUID())
    ),
  options: z
    .object({
      createPR: z.boolean().default(true),
      postToGitHub: z.boolean().default(false),
      maxAttempts: z.number().int().min(1).max(5).default(3),
    })
    .default({}),
})

export const AutoResolveIssueResponseSchema = z.object({
  jobId: z.string().uuid(),
  issueNumber: z.number().int().positive(),
  status: z.enum(["started", "queued", "error"]),
  message: z.string(),
  estimatedCompletionTime: z.date().optional(),
})

export type AutoResolveIssueRequest = z.infer<
  typeof AutoResolveIssueRequestSchema
>
export type AutoResolveIssueResponse = z.infer<
  typeof AutoResolveIssueResponseSchema
>
```

```typescript
// app/api/workflow/autoResolveIssue/route.ts (AFTER Step 1)
import { AutoResolveIssueRequestSchema } from "@/lib/application/dtos/AutoResolveIssue"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // ✅ Zod validation at API boundary
    const validatedRequest = AutoResolveIssueRequestSchema.parse(body)

    // ✅ Clean, validated data
    const { issueNumber, repoFullName, jobId, options } = validatedRequest

    // ... rest of logic (still needs refactoring)
    const apiKey = await getUserOpenAIApiKey()
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 })
    }

    const repo = await getRepoFromString(repoFullName)
    const issue = await getIssue({ fullName: repoFullName, issueNumber })

    await autoResolveIssue({
      issue: issue.issue,
      repository: repo,
      apiKey,
      jobId,
    })

    // ✅ Consistent response format
    const response = {
      jobId,
      issueNumber,
      status: "started" as const,
      message: `Auto-resolution started for issue #${issueNumber}`,
    }

    return NextResponse.json(response)
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

## Migration Step 2: Create Use Case with Zod

Extract business logic into a use case with Zod validation:

```typescript
// lib/application/usecases/AutoResolveIssueUseCase.ts (NEW)
import { z } from "zod"
import {
  AutoResolveIssueRequest,
  AutoResolveIssueResponse,
  AutoResolveIssueRequestSchema,
  AutoResolveIssueResponseSchema,
} from "../dtos/AutoResolveIssue"

export class AutoResolveIssueUseCase {
  async execute(rawRequest: unknown): Promise<AutoResolveIssueResponse> {
    // ✅ Validate input
    const request = AutoResolveIssueRequestSchema.parse(rawRequest)

    // ✅ Application-level validation
    await this.validateApplicationRules(request)

    // ✅ Business logic orchestration
    const apiKey = await getUserOpenAIApiKey()
    if (!apiKey) {
      throw new Error("Missing OpenAI API key")
    }

    const repo = await getRepoFromString(request.repoFullName)
    const issueResult = await getIssue({
      fullName: request.repoFullName,
      issueNumber: request.issueNumber,
    })

    if (issueResult.type !== "success") {
      throw new Error("Failed to get issue")
    }

    // Start the workflow
    await autoResolveIssue({
      issue: issueResult.issue,
      repository: repo,
      apiKey,
      jobId: request.jobId,
    })

    // ✅ Create and validate response
    const response = {
      jobId: request.jobId,
      issueNumber: request.issueNumber,
      status: "started" as const,
      message: `Auto-resolution started for issue #${request.issueNumber}`,
      estimatedCompletionTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    }

    return AutoResolveIssueResponseSchema.parse(response)
  }

  private async validateApplicationRules(
    request: AutoResolveIssueRequest
  ): Promise<void> {
    // Application-specific validation that might require external services
    const ApplicationRulesSchema = z.object({
      repoFullName: z.string().refine(async (repo) => {
        // Check if user has access to repo
        const hasAccess = await checkRepoAccess(repo)
        return hasAccess
      }, "Access denied to repository"),
    })

    await ApplicationRulesSchema.parseAsync({
      repoFullName: request.repoFullName,
    })
  }
}
```

```typescript
// app/api/workflow/autoResolveIssue/route.ts (AFTER Step 2)
import { AutoResolveIssueUseCase } from "@/lib/application/usecases/AutoResolveIssueUseCase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // ✅ Delegate to use case
    const useCase = new AutoResolveIssueUseCase()
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

## Migration Step 3: Add Domain Entity with Zod

Create a domain entity with business rule validation:

```typescript
// lib/domain/entities/Issue.ts (NEW)
import { z } from "zod"

export const IssueStateSchema = z.enum(["open", "closed", "draft"])

const IssueBusinessRulesSchema = z.object({
  title: z
    .string()
    .min(5, "Issue title must be at least 5 characters")
    .max(200, "Issue title cannot exceed 200 characters"),
  body: z.string().min(10, "Issue description must be at least 10 characters"),
  labels: z.array(z.string()).max(10, "Cannot have more than 10 labels"),
})

export class Issue {
  constructor(
    public readonly number: number,
    public readonly title: string,
    public readonly body: string,
    public readonly repoFullName: string,
    private _state: z.infer<typeof IssueStateSchema> = "open",
    private _labels: string[] = []
  ) {
    // ✅ Validate business rules on construction
    this.validateBusinessRules()
  }

  // ✅ Business logic with Zod validation
  canBeAutoResolved(): boolean {
    const AutoResolutionCriteriaSchema = z
      .object({
        state: IssueStateSchema,
        body: z.string(),
        labels: z.array(z.string()),
        complexity: z.number().min(0).max(10),
      })
      .refine((data) => {
        return (
          data.state === "open" &&
          data.complexity <= 5 &&
          !data.labels.some((l) => l.includes("manual-only")) &&
          data.body.length >= 20
        )
      }, "Issue does not meet auto-resolution criteria")

    const result = AutoResolutionCriteriaSchema.safeParse({
      state: this._state,
      body: this.body,
      labels: this._labels,
      complexity: this.calculateComplexity(),
    })

    return result.success
  }

  private validateBusinessRules(): void {
    const result = IssueBusinessRulesSchema.safeParse({
      title: this.title,
      body: this.body,
      labels: this._labels,
    })

    if (!result.success) {
      const errors = result.error.errors.map((e) => e.message).join(", ")
      throw new Error(`Invalid issue: ${errors}`)
    }
  }

  private calculateComplexity(): number {
    // Business logic for calculating issue complexity
    let complexity = 0
    complexity += this._labels.length * 0.5
    complexity += Math.min(this.body.length / 200, 3)
    return Math.min(complexity, 10)
  }

  get state(): z.infer<typeof IssueStateSchema> {
    return this._state
  }

  get labels(): readonly string[] {
    return [...this._labels]
  }
}

export type IssueState = z.infer<typeof IssueStateSchema>
```

## Migration Step 4: Update Infrastructure with Zod

Add validation to external data sources:

```typescript
// lib/infrastructure/repositories/Neo4jIssueRepository.ts (NEW)
import { z } from "zod"
import { Issue } from "../../domain/entities/Issue"

// ✅ External data validation schema
const Neo4jIssueNodeSchema = z.object({
  number: z.number().int(),
  title: z.string(),
  body: z.string(),
  state: z.enum(["open", "closed", "draft"]),
  repoFullName: z.string(),
  labels: z.array(z.string()).default([]),
})

export class Neo4jIssueRepository {
  async getByNumber(issueNumber: number, repoFullName: string): Promise<Issue> {
    const result = await this.neo4jClient.run(
      "MATCH (i:Issue {number: $number, repoFullName: $repo}) RETURN i",
      { number: issueNumber, repo: repoFullName }
    )

    if (!result.records.length) {
      throw new Error(`Issue #${issueNumber} not found`)
    }

    // ✅ Validate data from external source
    const rawData = result.records[0].get("i").properties
    const validatedData = Neo4jIssueNodeSchema.parse(rawData)

    // ✅ Convert to domain entity
    return new Issue(
      validatedData.number,
      validatedData.title,
      validatedData.body,
      validatedData.repoFullName,
      validatedData.state,
      validatedData.labels
    )
  }
}
```

## Migration Step 5: Update Component with Zod

Finally, update the React component to use the new validated types:

```typescript
// components/issues/controllers/AutoResolveIssueController.tsx (AFTER)
import { z } from "zod"
import {
  AutoResolveIssueRequestSchema,
  AutoResolveIssueResponseSchema,
} from "@/lib/application/dtos/AutoResolveIssue"

interface Props {
  issueNumber: number
  repoFullName: string
  onStart: () => void
  onComplete: () => void
  onError: () => void
}

export default function AutoResolveIssueController({
  issueNumber,
  repoFullName,
  onStart,
  onComplete,
  onError,
}: Props) {
  const execute = async () => {
    try {
      onStart()

      // ✅ Validate client-side data
      const request = AutoResolveIssueRequestSchema.parse({
        issueNumber,
        repoFullName,
        jobId: "", // Will auto-generate UUID
        options: {
          createPR: true,
          postToGitHub: false,
          maxAttempts: 3,
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

      toast.success(`Workflow started: ${result.message}`)
      onComplete()
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(
          `Invalid data: ${error.errors.map((e) => e.message).join(", ")}`
        )
      } else {
        toast.error(error.message)
      }
      onError()
    }
  }

  return { execute }
}
```

## Benefits After Migration

### ✅ Type Safety

- All data validated at runtime and compile time
- Automatic TypeScript types from schemas
- Consistent interfaces across layers

### ✅ Better Error Handling

- Detailed validation errors with field paths
- Consistent error message format
- Client and server-side validation

### ✅ Self-Documenting Code

- Schemas serve as documentation
- Clear validation rules and constraints
- Business rules expressed in code

### ✅ Cleaner Architecture

- Clear separation of concerns
- Domain logic isolated in entities
- Consistent data flow between layers

## Migration Tips

1. **Start Small**: Begin with one API endpoint or component
2. **Validate at Boundaries**: Add Zod at layer transitions first
3. **Gradual Adoption**: Keep old and new code working side by side
4. **Reuse Schemas**: Share schemas between layers appropriately
5. **Test Thoroughly**: Validate that all edge cases are handled

This migration approach ensures you get the benefits of Zod while maintaining clean architecture principles and not breaking existing functionality.
