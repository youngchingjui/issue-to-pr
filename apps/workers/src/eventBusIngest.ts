/*
 * Worker that ingests workflow events from Redis Streams and persists them to Neo4j.
 *
 * Design:
 * - Streams are written by EventBusAdapter under keys: workflow:{workflowId}:events
 * - We create/ensure a consumer group (neo4j_ingest) per stream and read with XREADGROUP.
 * - We process and persist each message idempotently by using the Redis stream entry id
 *   as the Neo4j Event.id and skipping if it already exists.
 * - We also attempt to claim and process any pending entries on startup.
 */

import dotenv from "dotenv"
import IORedis from "ioredis"
import path from "path"
import { fileURLToPath } from "url"

// Import Neo4j event service helpers via relative path to repo root
import {
  createErrorEvent,
  createLLMResponseEvent,
  createReasoningEvent,
  createStatusEvent,
  createSystemPromptEvent,
  createToolCallEvent,
  createToolCallResultEvent,
  createUserResponseEvent,
  createWorkflowStateEvent,
  getEventById,
} from "../../../lib/neo4j/services/event"

// Environment loading from monorepo root
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "../../../")
const envFilename =
  process.env.NODE_ENV === "production"
    ? ".env.production.local"
    : ".env.local"

dotenv.config({ path: path.join(repoRoot, envFilename) })
dotenv.config({ path: path.join(repoRoot, ".env") })

// Basic types for incoming events (aligns with shared event bus payloads)
type Metadata = Record<string, unknown> | undefined
interface BaseEvent {
  type: string
  timestamp: string
  content?: string
  metadata?: Metadata
}

const redisUrl = process.env.REDIS_URL
if (!redisUrl) {
  throw new Error("REDIS_URL is not set")
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null })
const groupName = "neo4j_ingest"
const consumerName = `consumer-${process.pid}`

function streamKeyToWorkflowId(streamKey: string): string | null {
  // Expected format: workflow:{workflowId}:events
  const match = /^workflow:(.*):events$/.exec(streamKey)
  return match?.[1] ?? null
}

async function ensureConsumerGroup(streamKey: string) {
  try {
    // Create group at $ so we only process new messages by default
    // MKSTREAM ensures the stream exists
    await connection.xgroup(
      "CREATE",
      streamKey,
      groupName,
      "$",
      "MKSTREAM"
    )
    console.log(`Created consumer group ${groupName} for ${streamKey}`)
  } catch (err: any) {
    // Ignore BUSYGROUP errors (group already exists)
    if (typeof err?.message === "string" && err.message.includes("BUSYGROUP")) {
      return
    }
    throw err
  }
}

async function claimPending(streamKey: string) {
  try {
    // Claim all pending entries (min-idle 0) to this consumer in small batches
    while (true) {
      const res = (await (connection as any).xautoclaim(
        streamKey,
        groupName,
        consumerName,
        0,
        "0-0",
        "COUNT",
        100
      )) as [string, Array<[string, string[]]>]

      // res[1] contains the claimed messages
      const claimed = res?.[1] ?? []
      if (claimed.length === 0) break

      for (const [id, fields] of claimed) {
        await processEntry(streamKey, id, fields)
        await connection.xack(streamKey, groupName, id)
      }
    }
  } catch (err) {
    console.error(`Error claiming pending for ${streamKey}:`, err)
  }
}

async function processEntry(
  streamKey: string,
  id: string,
  fields: string[]
) {
  try {
    const workflowId = streamKeyToWorkflowId(streamKey)
    if (!workflowId) return

    // Fields are [key1, value1, key2, value2, ...]
    const eventJson = fields[fields.findIndex((f) => f === "event") + 1]
    if (!eventJson) return

    const event = JSON.parse(eventJson) as BaseEvent

    // Idempotency: skip if event already exists using stream entry id as Event.id
    try {
      const existing = await getEventById(id)
      if (existing) {
        return
      }
    } catch (_) {
      // getEventById throws if not found or query issue; continue to create
    }

    await persistToNeo4j(workflowId, event, id)
  } catch (err) {
    console.error("Failed to process entry:", err)
  }
}

async function persistToNeo4j(
  workflowId: string,
  event: BaseEvent,
  id: string
): Promise<void> {
  const content = event.content ?? undefined
  const metadata = event.metadata

  switch (event.type) {
    case "workflow.started": {
      await createWorkflowStateEvent({ workflowId, state: "running", id })
      if (content) await createStatusEvent({ workflowId, content, id })
      return
    }

    case "workflow.completed": {
      if (content) await createStatusEvent({ workflowId, content, id })
      await createWorkflowStateEvent({ workflowId, state: "completed", id })
      return
    }

    case "workflow.error": {
      await createErrorEvent({
        workflowId,
        content: content ?? "Unknown error",
        id,
      })
      await createWorkflowStateEvent({ workflowId, state: "error", id })
      return
    }

    case "workflow.state": {
      const state =
        (metadata?.["state"] as "running" | "completed" | "error" | "timedOut" | undefined) ??
        "running"
      await createWorkflowStateEvent({ workflowId, state, content, id })
      return
    }

    case "status": {
      if (content) await createStatusEvent({ workflowId, content, id })
      return
    }

    case "llm.started": {
      await createStatusEvent({
        workflowId,
        content: content ?? "LLM started",
        id,
      })
      return
    }

    case "llm.completed": {
      await createStatusEvent({
        workflowId,
        content: content ?? "LLM completed",
        id,
      })
      return
    }

    // Message events
    case "system_prompt": {
      if (!content) return
      await createSystemPromptEvent({ workflowId, content, id })
      return
    }

    case "user_message": {
      if (!content) return
      await createUserResponseEvent({ workflowId, content, id })
      return
    }

    case "assistant_message": {
      if (!content) return
      await createLLMResponseEvent({
        workflowId,
        content,
        id,
        model: (metadata?.["model"] as string) || undefined,
      })
      return
    }

    case "tool.call": {
      const toolName = (metadata?.["toolName"] as string) || "unknown"
      const toolCallId = (metadata?.["toolCallId"] as string) || ""
      const args = JSON.stringify(metadata?.["args"] || {})
      await createToolCallEvent({ workflowId, toolName, toolCallId, args, id })
      return
    }

    case "tool.result": {
      const toolName = (metadata?.["toolName"] as string) || "unknown"
      const toolCallId = (metadata?.["toolCallId"] as string) || ""
      await createToolCallResultEvent({
        workflowId,
        toolName,
        toolCallId,
        content: content ?? "",
        id,
      })
      return
    }

    case "reasoning": {
      const summary = (metadata?.["summary"] as string) || content || ""
      await createReasoningEvent({ workflowId, summary, id })
      return
    }

    default: {
      if (content) await createStatusEvent({ workflowId, content, id })
    }
  }
}

async function discoverStreams(): Promise<string[]> {
  const pattern = "workflow:*:events"
  const keys: string[] = []
  const stream = connection.scanStream({ match: pattern, count: 100 })

  return await new Promise((resolve, reject) => {
    stream.on("data", (resultKeys: string[]) => {
      for (const key of resultKeys) keys.push(key)
    })
    stream.on("end", () => resolve(Array.from(new Set(keys))))
    stream.on("error", (err) => reject(err))
  })
}

async function run() {
  console.log("Starting Redis Streams -> Neo4j ingester…")
  const knownStreams = new Set<string>()

  // Initial discovery and group setup
  const initialKeys = await discoverStreams()
  for (const key of initialKeys) {
    await ensureConsumerGroup(key)
    await claimPending(key)
    knownStreams.add(key)
  }

  // Main loop: read from all known streams; periodically discover new ones
  while (true) {
    try {
      // Periodically discover new streams (every ~5s)
      const discovered = await discoverStreams()
      for (const key of discovered) {
        if (!knownStreams.has(key)) {
          await ensureConsumerGroup(key)
          await claimPending(key)
          knownStreams.add(key)
        }
      }

      const streams = Array.from(knownStreams)
      if (streams.length === 0) {
        // Nothing to read yet
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }

      // XREADGROUP across all known streams, waiting for new entries
      const args: (string | number)[] = [
        "GROUP",
        groupName,
        consumerName,
        "BLOCK",
        5000,
        "COUNT",
        50,
        "STREAMS",
        ...streams,
        ...streams.map(() => ">"),
      ]

      const results = (await (connection as any).xreadgroup(
        ...args
      )) as Array<[string, Array<[string, string[]]>]> | null

      if (results && Array.isArray(results)) {
        for (const [streamKey, entries] of results) {
          for (const [id, fields] of entries) {
            await processEntry(streamKey, id, fields)
            await connection.xack(streamKey, groupName, id)
          }
        }
      }
    } catch (err) {
      console.error("Ingest loop error:", err)
      // brief backoff
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
}

run().catch((err) => {
  console.error("Fatal error in ingester:", err)
  process.exit(1)
})

