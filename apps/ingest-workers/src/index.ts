/*
 * Ingest worker: consumes events from a Redis Stream and persists them to Neo4j.
 *
 * Goals:
 *  - Use Redis Streams consumer groups for reliability and scaling
 *  - Load env from monorepo root .env files and per-worker-group env_file
 *  - Graceful shutdown: finish current message, stop reading new ones
 *
 * This is a controller-level entry point. Business logic lives in lib/neo4j/services.
 */
import dotenv from "dotenv"
import IORedis from "ioredis"
import path from "path"
import { fileURLToPath } from "url"

import { n4j } from "@/lib/neo4j/client"
import {
  createErrorEvent,
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import type { AllEvents } from "@shared/entities/events"

// Load environment variables from monorepo root regardless of CWD
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "../../../")

const envFilename =
  process.env.NODE_ENV === "production" ? ".env.production.local" : ".env.local"

dotenv.config({ path: path.join(repoRoot, envFilename) })
// Optional: also load base .env as a fallback if present
dotenv.config({ path: path.join(repoRoot, ".env") })

// Configuration
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"
// Note: EventBusAdapter currently publishes to per-workflow streams.
// For the ingest foundation, we use a single stream key that an upstream fan-in can write to.
const STREAM_KEY = process.env.INGEST_STREAM_KEY || "workflow:events:ingest"
const GROUP_NAME = process.env.INGEST_GROUP || "ingest"
const CONSUMER_NAME = process.env.INGEST_CONSUMER || `consumer-${Math.random().toString(36).slice(2, 8)}`
const BLOCK_MS = Number(process.env.INGEST_BLOCK_MS || 5000)
const BATCH_SIZE = Number(process.env.INGEST_BATCH_SIZE || 1)

let shuttingDown = false
let processing = false

const redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })

async function ensureGroup() {
  try {
    // Create group starting from the end (\">\") so new messages only
    await redis.xgroup("CREATE", STREAM_KEY, GROUP_NAME, ">", "MKSTREAM")
    console.log(`Created consumer group ${GROUP_NAME} on ${STREAM_KEY}`)
  } catch (err) {
    const msg = (err as any)?.message || String(err)
    if (msg.includes("BUSYGROUP")) {
      // Group already exists
    } else {
      console.error("Failed to create consumer group:", err)
      throw err
    }
  }
}

function parseEvent(raw: string): AllEvents | null {
  try {
    const obj = JSON.parse(raw)
    // We keep the schema validation lightweight at the foundation level
    return obj as AllEvents
  } catch (e) {
    console.error("Failed to parse event JSON:", e)
    return null
  }
}

async function persistEvent(workflowId: string, event: AllEvents) {
  switch (event.type) {
    case "status": {
      await createStatusEvent({ workflowId, content: event.content })
      return
    }
    case "workflow.error": {
      await createErrorEvent({ workflowId, content: event.message })
      return
    }
    case "workflow.state": {
      await createWorkflowStateEvent({ workflowId, state: event.state, content: event.content })
      return
    }
    default: {
      // TODO: Map remaining event types to specific persistence functions
      // For now, we store high-signal events and log the rest.
      console.log("[ingest] Unhandled event type (skipped)", event.type)
    }
  }
}

async function processEntry(entry: [string, string[]]) {
  const [id, fields] = entry
  // fields is an array like ["event", "{...json...}", "workflowId", "..." ] depending on producer
  // Our convention: field "event" holds the payload and optional field "workflowId" if available
  const obj: Record<string, string> = {}
  for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1]

  const payload = obj["event"]
  const workflowId = obj["workflowId"] || obj["workflow_id"] || obj["wf"] || "unknown"
  if (!payload) {
    console.warn(`[ingest] Missing 'event' field in stream entry ${id}`)
    return { id, ok: true }
  }

  const evt = parseEvent(payload)
  if (!evt) return { id, ok: true }

  try {
    await persistEvent(workflowId, evt)
    return { id, ok: true }
  } catch (e) {
    console.error(`[ingest] Failed to persist event ${id}:`, e)
    return { id, ok: false }
  }
}

async function main() {
  console.log("[ingest] Starting ingest worker...", { STREAM_KEY, GROUP_NAME, CONSUMER_NAME })
  await n4j.connect()
  await ensureGroup()

  while (!shuttingDown) {
    try {
      processing = false
      const res = await redis.xreadgroup(
        "GROUP",
        GROUP_NAME,
        CONSUMER_NAME,
        "BLOCK",
        BLOCK_MS,
        "COUNT",
        BATCH_SIZE,
        "STREAMS",
        STREAM_KEY,
        ">"
      )

      if (!res) {
        // Timeout, loop again allowing shutdown check
        continue
      }

      // res: [[ stream, [[id, [field, value, ...]], ...] ]]
      const [_stream, entries] = res[0]
      for (const entry of entries) {
        if (shuttingDown) break
        processing = true
        const { id, ok } = await processEntry(entry)
        if (ok) await redis.xack(STREAM_KEY, GROUP_NAME, id)
        processing = false
      }
    } catch (err) {
      if (shuttingDown) break
      console.error("[ingest] Error in poll loop:", err)
      // small delay to avoid tight error loop
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  console.log("[ingest] Shutting down: closing resources...")
  try {
    await redis.quit()
  } catch {}
  try {
    await n4j.close()
  } catch {}
  console.log("[ingest] Shutdown complete.")
}

function requestShutdown(signal: string) {
  console.log(`[ingest] Received ${signal}, draining...`)
  shuttingDown = true
  // If we're blocked waiting for new messages, end the connection to unblock
  // but only after we finish currently processing message.
  if (!processing) {
    // No processing at the moment; nudge the loop by disconnecting
    redis.disconnect()
  }
}

process.on("SIGTERM", () => requestShutdown("SIGTERM"))
process.on("SIGINT", () => requestShutdown("SIGINT"))

main().catch((err) => {
  console.error("[ingest] Fatal error:", err)
  process.exit(1)
})

