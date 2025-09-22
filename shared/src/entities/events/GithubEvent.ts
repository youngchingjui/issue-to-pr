// issue.fetched — optional content/metadata

import { z } from "zod"

// Common fields shared by all workflow events
const BaseFields = z.object({
  id: z.string(),
  timestamp: z.date(), // ISO timestamp
})

export const IssueFetchedEventSchema = BaseFields.extend({
  type: z.literal("issue.fetched"),
  content: z.string().optional(),
})
export type IssueFetchedEvent = z.infer<typeof IssueFetchedEventSchema>

export const GithubEventSchema = z.discriminatedUnion("type", [
  IssueFetchedEventSchema,
])
export type GithubEvent = z.infer<typeof GithubEventSchema>
export type GithubEventType = GithubEvent["type"]
