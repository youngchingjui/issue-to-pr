// TODO: This should be in a tools/ folder since we'll be defining many tools

import { z, type ZodType } from "zod"

export interface Tool<Schema extends ZodType, Output> {
  type: "function"
  function: {
    name: string
    parameters: Record<string, unknown>
    description: string
    type: "function"
  }
  schema: Schema
  handler: (params: z.input<Schema>) => Promise<Output> | Output
}
