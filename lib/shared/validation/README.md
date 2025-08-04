# Validation Utilities

This directory contains shared validation utilities and common Zod patterns used across the application.

## Common Patterns

### Layer-Specific Validation

```typescript
// Domain Layer - Business Rules
const BusinessRuleSchema = z.object({
  title: z
    .string()
    .min(5)
    .refine(
      (title) => !title.toLowerCase().includes("test"),
      "Business rule: No test references in production"
    ),
})

// Application Layer - Request/Response
const APIRequestSchema = z.object({
  data: BusinessRuleSchema,
  metadata: z.object({
    userId: z.string().uuid(),
    timestamp: z.date().default(() => new Date()),
  }),
})

// Infrastructure Layer - External Data
const ExternalAPISchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z
    .string()
    .nullable()
    .transform((val) => val ?? "unknown"),
})
```

### Reusable Schemas

Create common schemas that can be composed across layers:

```typescript
// lib/shared/validation/common.ts
export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

export const RepoIdentifierSchema = z
  .string()
  .regex(/^[^/]+\/[^/]+$/, "Must be in format 'owner/repo'")
  .transform((val) => val.toLowerCase())
```

### Error Handling Utilities

```typescript
// lib/shared/validation/errors.ts
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

export const createValidator = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown): T => {
    const result = schema.safeParse(data)

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
        code: e.code,
      }))

      throw new ValidationError("Validation failed", errors)
    }

    return result.data
  }
}
```

## Usage Guidelines

1. **Import consistently**: Use absolute imports from `@/lib/shared/validation`
2. **Name clearly**: Schema names should indicate their purpose and layer
3. **Compose schemas**: Build complex schemas from simpler ones
4. **Handle errors**: Always use consistent error handling patterns
5. **Document business rules**: Use `.refine()` with clear error messages for business logic

See the [Zod in Clean Architecture Guide](../../docs/guides/zod-in-clean-architecture.md) for complete patterns and examples.
