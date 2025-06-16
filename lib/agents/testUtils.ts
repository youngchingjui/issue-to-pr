import fs from "fs/promises"
import path from "path"

import { getMessagesForWorkflowRun } from "@/lib/neo4j/repositories/event"
import { messageEventSchema } from "@/lib/types/db/neo4j"

/**
 * Loads agent messages for test/dev workflows, either from a DB workflow run, or from a static fixture.
 * Can trim the array up to an index, or (future: marker).
 * @param source runId in database, or file path to JSON fixture.
 * @param cutoff Message count (inclusive, index+1) to include from array; if undefined, full array is returned.
 * @param fromFixture Force loading from file fixture (even if source looks like a runId).
 */
export async function loadAgentMessages({
  source,
  cutoff,
  fromFixture = false,
}: {
  source: string
  cutoff?: number
  fromFixture?: boolean
}): Promise<unknown[]> {
  let messages: unknown[] = []

  // Load from fixture (local file)
  if (fromFixture || source.endsWith(".json")) {
    const data = await fs.readFile(
      path.isAbsolute(source) ? source : path.join(process.cwd(), source),
      "utf-8"
    )
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed)) {
      throw new Error("Fixture file must contain an array of messages")
    }
    messages = parsed
  } else {
    // Load from Neo4j via workflow run id
    // This requires a DB connection and read permissions
    messages = await getMessagesForWorkflowRun(
      // This assumes a global driver/session or user context - adapt as needed
      { runId: source }
    )
  }

  // Validate each message using the schema if possible
  messages = messages.map((msg) => messageEventSchema.parse(msg))
  // If cutoff specified, trim the array
  if (typeof cutoff === "number") {
    return messages.slice(0, cutoff)
  }
  return messages
}
