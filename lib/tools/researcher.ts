import { zodFunction } from "openai/helpers/zod"
import { z } from "zod"

import { Tool } from "@/lib/types"

const researcherParameters = z.object({
  query: z.string().describe("What information to search for"),
})

const researcherTool: Tool<typeof researcherParameters> = {
  parameters: researcherParameters,
  tool: zodFunction({
    name: "call_researcher",
    parameters: researcherParameters,
  }),
  handler: async () => {
    // TODO: Implement
  },
}

export default researcherTool
