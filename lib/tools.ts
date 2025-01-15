import { zodFunction } from "openai/helpers/zod"
import { z } from "zod"

export const callResearcherTool = zodFunction({
  name: "call_researcher",
  parameters: z.object({
    query: z.string().describe("What information to search for"),
  }),
})

export const callLibrarianTool = zodFunction({
  name: "call_librarian",
  parameters: z.object({
    request: z.string().describe("What information to find in the codebase"),
  }),
})

export const callCoderTool = zodFunction({
  name: "call_coder",
  parameters: z.object({
    file: z.string().describe("Path to the file that needs to be modified"),
    instructions: z
      .string()
      .describe("Specific instructions for what changes to make to the file"),
  }),
})
