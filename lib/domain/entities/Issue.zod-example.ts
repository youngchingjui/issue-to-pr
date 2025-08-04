// EXAMPLE: Issue entity with Zod validation (following clean architecture)
// This shows how to use Zod for domain-level business rule validation

import { z } from "zod"

// ✅ Domain-level schemas for business rules
export const IssueStateSchema = z.enum(["open", "closed", "draft"])

export const IssuePrioritySchema = z.enum(["low", "normal", "high", "urgent"])

// ✅ Business rules schema
const IssueBusinessRulesSchema = z.object({
  title: z
    .string()
    .min(5, "Issue title must be at least 5 characters")
    .max(100, "Issue title cannot exceed 100 characters")
    .refine((title) => {
      // Business rule: Production issues cannot be test-related
      const isProduction = process.env.NODE_ENV === "production"
      if (isProduction && title.toLowerCase().includes("test")) {
        return false
      }
      return true
    }, "Production issues cannot contain 'test' in title"),

  body: z
    .string()
    .min(10, "Issue description must be at least 10 characters")
    .refine((body) => {
      // Business rule: Issue must have clear problem description
      const hasWhatSection = /what.*happened/i.test(body)
      const hasExpectedSection = /expected.*behavior/i.test(body)
      return hasWhatSection || hasExpectedSection
    }, "Issue must describe what happened or expected behavior"),

  labels: z
    .array(z.string())
    .max(10, "Cannot have more than 10 labels")
    .refine((labels) => {
      // Business rule: Cannot have conflicting priority labels
      const priorityLabels = labels.filter(
        (l) =>
          l.startsWith("priority:") ||
          l.includes("urgent") ||
          l.includes("critical")
      )
      return priorityLabels.length <= 1
    }, "Cannot have multiple priority labels"),

  assignees: z
    .array(z.string())
    .max(3, "Cannot assign more than 3 people to an issue")
    .refine((assignees) => {
      // Business rule: All assignees must be unique
      return new Set(assignees).size === assignees.length
    }, "Cannot assign the same person multiple times"),
})

// ✅ Auto-resolution criteria schema (business logic)
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

// ✅ Domain entity with Zod validation
export class Issue {
  private _state: z.infer<typeof IssueStateSchema>
  private _labels: string[]
  private _assignees: string[]

  constructor(
    public readonly number: number,
    public readonly title: string,
    public readonly body: string,
    public readonly repoFullName: string,
    state: z.infer<typeof IssueStateSchema> = "open",
    labels: string[] = [],
    assignees: string[] = []
  ) {
    // ✅ Validate business rules on construction
    this.validateBusinessRules(title, body, labels, assignees)

    this._state = state
    this._labels = labels
    this._assignees = assignees
  }

  // ✅ Business method with validation
  canBeAutoResolved(): boolean {
    const complexity = this.calculateComplexity()

    const result = AutoResolutionCriteriaSchema.safeParse({
      state: this._state,
      body: this.body,
      labels: this._labels,
      complexity,
    })

    return result.success
  }

  // ✅ State change with validation
  assign(newAssignees: string[]): void {
    const result = IssueBusinessRulesSchema.pick({ assignees: true }).safeParse(
      {
        assignees: newAssignees,
      }
    )

    if (!result.success) {
      throw new Error(
        `Cannot assign: ${result.error.errors.map((e) => e.message).join(", ")}`
      )
    }

    this._assignees = newAssignees
  }

  // ✅ State change with business rules
  close(): void {
    if (this._assignees.length === 0) {
      throw new Error("Cannot close unassigned issue")
    }

    this._state = "closed"
  }

  addLabels(newLabels: string[]): void {
    const combinedLabels = [...this._labels, ...newLabels]

    const result = IssueBusinessRulesSchema.pick({ labels: true }).safeParse({
      labels: combinedLabels,
    })

    if (!result.success) {
      throw new Error(
        `Invalid labels: ${result.error.errors.map((e) => e.message).join(", ")}`
      )
    }

    this._labels = combinedLabels
  }

  // ✅ Private validation method
  private validateBusinessRules(
    title: string,
    body: string,
    labels: string[],
    assignees: string[]
  ): void {
    const result = IssueBusinessRulesSchema.safeParse({
      title,
      body,
      labels,
      assignees,
    })

    if (!result.success) {
      const errors = result.error.errors.map((e) => e.message).join(", ")
      throw new Error(`Invalid issue: ${errors}`)
    }
  }

  // ✅ Domain calculation method
  private calculateComplexity(): number {
    // Business logic for complexity calculation
    let complexity = 0

    // More labels = more complex
    complexity += this._labels.length * 0.5

    // Longer body = potentially more complex
    complexity += Math.min(this.body.length / 200, 3)

    // Certain keywords increase complexity
    const complexKeywords = ["database", "migration", "security", "performance"]
    const keywordMatches = complexKeywords.filter((keyword) =>
      this.body.toLowerCase().includes(keyword)
    ).length
    complexity += keywordMatches * 2

    return Math.min(complexity, 10) // Cap at 10
  }

  // ✅ Getters with validation
  get state(): z.infer<typeof IssueStateSchema> {
    return this._state
  }

  get labels(): readonly string[] {
    return [...this._labels] // Return immutable copy
  }

  get assignees(): readonly string[] {
    return [...this._assignees]
  }

  get isOpen(): boolean {
    return this._state === "open"
  }

  get isClosed(): boolean {
    return this._state === "closed"
  }

  // ✅ Domain event with validation
  toEvent(eventType: "created" | "updated" | "closed") {
    const EventSchema = z.object({
      type: z.enum(["created", "updated", "closed"]),
      issueNumber: z.number().int().positive(),
      repoFullName: z.string().min(1),
      timestamp: z.date(),
    })

    return EventSchema.parse({
      type: eventType,
      issueNumber: this.number,
      repoFullName: this.repoFullName,
      timestamp: new Date(),
    })
  }
}

// ✅ Export schemas for use in other layers
export { IssueBusinessRulesSchema, AutoResolutionCriteriaSchema }

// ✅ Type exports
export type IssueState = z.infer<typeof IssueStateSchema>
export type IssuePriority = z.infer<typeof IssuePrioritySchema>
