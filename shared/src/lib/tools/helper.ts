import { z, ZodType } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

import { type Tool } from "@/shared/lib/types"

type Params<Schema extends ZodType, Output> = {
  name: string
  description: string
  schema: Schema
  handler: (params: z.infer<Schema>) => Promise<Output> | Output
}

export const createTool = <Schema extends ZodType, Output>({
  name,
  description,
  schema,
  handler,
}: Params<Schema, Output>): Tool<Schema, Output> => {
  return {
    type: "function" as const,
    function: {
      name,
      parameters: zodToJsonSchema(schema),
      description,
      type: "function",
    },
    schema,
    // Accept input shape and parse to apply defaults before calling the user handler
    handler: (params: z.input<Schema>) => handler(schema.parse(params)),
  }
}
