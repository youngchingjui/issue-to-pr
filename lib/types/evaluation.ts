import { z } from "zod"

export const PlanEvaluationSchema = z
  .object({
    noTypeCasting: z
      .boolean()
      .describe(
        "true if the plan does not use TypeScript type casting like 'as SomeType'"
      ),
    noAnyTypes: z
      .boolean()
      .describe(
        "false if the plan suggests using the 'any' type. True if there is suggestion to use the 'any' type anywhere in the Plan. "
      ),
    noSingleItemHelper: z
      .boolean()
      .describe(
        "true if the plan does NOT introduce single-purpose helper functions whose only job is to convert one Neo4j value (for example wrapping Integer.toNumber() in neo4jToJsNumber). Built-in Neo4j conversion methods—.toNumber(), .toString(), etc.—or a general object-level helper should be used instead. Return false if the plan suggests any helper dedicated to converting a single property or primitive value."
      ),
    noUnnecessaryDestructuring: z
      .boolean()
      .describe(
        "true if the plan does NOT destructure an object just to re-wrap the same property before passing it to a helper. For instance, avoid patterns like `const { number } = dbIssue; return { ...neo4jToJs({ number }) }` when `neo4jToJs(dbIssue)` would suffice. Return false when such redundant destructuring is present in the plan."
      ),
  })
  .describe(
    "Evaluation schema for plans generated from youngchingjui/issue-to-pr#753"
  )

export type PlanEvaluationResult = z.infer<typeof PlanEvaluationSchema>

export const PlanEvaluationRequestSchema = z.object({
  plan: z.string().min(1),
})
export type PlanEvaluationRequest = z.infer<typeof PlanEvaluationRequestSchema>
