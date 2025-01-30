import { z } from "zod"

const callCoderAgentParameters = z.object({
  instructions: z.string,
  relativeFilePath: z.string(),
})
