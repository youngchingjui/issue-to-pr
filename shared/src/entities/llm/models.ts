import { z } from "zod"

// We can expand this as needed
export const modelList = z.enum(["gpt-4o-mini", "gpt-4o", "gpt-5", "o3"])
