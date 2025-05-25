import { z, ZodType } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

import { Tool } from "@/lib/types"

export const createTool = <Schema extends ZodType, Output>({
  name,
  description,
  schema,
  handler,
}: {
  name: string
  description: string
  schema: Schema
  handler: (params: z.infer<Schema>) => Promise<Output> | Output
}): Tool<Schema, Output> => {
  return {
    type: "function",
    function: {
      name,
      parameters: zodToJsonSchema(schema),
      description,
    },
    schema,
    handler,
  }
}
