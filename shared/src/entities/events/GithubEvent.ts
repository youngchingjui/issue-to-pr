// issue.fetched — optional content/metadata

// Note: I think this file belongs in github adapters, rather than as a core entity.
// We've already started adding adapter-specific types, such as in
// shared/src/adapters/neo4j/types.ts, so perhaps we could do the same with regards to
// webhooks or Github here.
// In fact, webhooks is a NextJS-specific implementation, so we may also consider
// putting it there.
// Marking these as @deprecated for now.

import { z } from "zod"

/**
 * Common fields shared by all workflow events
 * @deprecated Use Github-adapter types or webhoook-adapter types instead
 */
const BaseFields = z.object({
  id: z.string(),
  timestamp: z.date(), // ISO timestamp
})

/**
 * @deprecated Use Github-adapter types or webhoook-adapter types instead
 */
export const IssueFetchedEventSchema = BaseFields.extend({
  type: z.literal("issue.fetched"),
  content: z.string().optional(),
})

/**
 * @deprecated Use Github-adapter types or webhoook-adapter types instead
 */
export type IssueFetchedEvent = z.infer<typeof IssueFetchedEventSchema>

/**
 * @deprecated Use Github-adapter types or webhoook-adapter types instead
 */
export const GithubEventSchema = z.discriminatedUnion("type", [
  IssueFetchedEventSchema,
])
/**
 * @deprecated Use Github-adapter types or webhoook-adapter types instead
 */
export type GithubEvent = z.infer<typeof GithubEventSchema>

/**
 * @deprecated Use Github-adapter types or webhoook-adapter types instead
 */
export type GithubEventType = GithubEvent["type"]
