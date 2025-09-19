/*
 * Worker that consumes Redis Streams for workflow events and persists them to Neo4j.
 *
 * To start locally: pnpm dev:worker
 */
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import { RedisStreamsConsumer } from "@shared/adapters/ioredis/RedisStreamsConsumer"
import { createNeo4jUnitOfWork } from "@shared/adapters/neo4j/Neo4jUnitOfWork"
import { runEventIngestion } from "@shared/usecases/events/ingestStreamEvent"
import { RandomUUIDGenerator } from "@shared/adapters/id/RandomUUIDGenerator"
import { SystemClock } from "@shared/adapters/time/SystemClock"

// Load environment variables from monorepo root regardless of CWD
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// dist -> workers -> apps -> repoRoot
const repoRoot = path.resolve(__dirname, "../../../")

const envFilename =
  process.env.NODE_ENV === "production" ? ".env.production.local" : ".env.local"

dotenv.config({ path: path.join(repoRoot, envFilename) })
dotenv.config({ path: path.join(repoRoot, ".env") })

const redisUrl = process.env.REDIS_URL
const neo4jUri = process.env.NEO4J_URI
const neo4jUser = process.env.NEO4J_USER
const neo4jPassword = process.env.NEO4J_PASSWORD

if (!redisUrl) throw new Error("REDIS_URL is not set")
if (!neo4jUri || !neo4jUser || !neo4jPassword)
  throw new Error(
    "Neo4j env vars NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD are required"
  )

const consumerGroup = process.env.EVENTS_CONSUMER_GROUP || "events-consumers"
const consumerName =
  process.env.EVENTS_CONSUMER_NAME ||
  `worker-${Math.random().toString(36).slice(2)}`

const consumer = new RedisStreamsConsumer(redisUrl)
const uow = createNeo4jUnitOfWork({
  uri: neo4jUri,
  user: neo4jUser,
  password: neo4jPassword,
})
const idGen = new RandomUUIDGenerator()
const clock = new SystemClock()

async function main() {
  // Each workflow has its own stream key. We cannot wildcard XREADGROUP across streams in Redis.
  // A simple approach is to subscribe to a known list, but for now we'll demonstrate with ensureGroup
  // on first use and consuming from a single stream when provided via env for local testing.
  const singleStream = process.env.EVENTS_STREAM_KEY // e.g., workflow:{workflowId}:events
  if (!singleStream) {
    console.warn(
      "EVENTS_STREAM_KEY not set. Set it to a specific stream like workflow:{id}:events to ingest."
    )
  }

  if (singleStream) {
    await consumer.ensureGroup(singleStream, consumerGroup)
    await consumer.readGroup({
      stream: singleStream,
      group: consumerGroup,
      consumer: consumerName,
      onMessage: async (msg) => {
        await uow.withTransaction(async (tx) => {
          // Delegate to the use case by simulating runEventIngestion handler per message
          // Extract workflow id from stream key
          const id = idGen.next()
          const match = /^workflow:([^:]+):events$/.exec(msg.stream)
          const workflowId = match?.[1]
          const ev: any = msg.event
          // Map and persist
          if (ev?.type === "assistant_message") {
            await tx.eventRepo.createGeneric(
              {
                id,
                type: "assistant_message",
                content: ev.content,
                model: ev.model,
              },
              tx
            )
          } else if (ev?.type === "tool_call") {
            await tx.eventRepo.createGeneric(
              {
                id,
                type: "tool_call",
                toolName: ev.toolName,
                toolCallId: ev.toolCallId,
                args: ev.args,
              },
              tx
            )
          } else if (ev?.type === "tool_call_result") {
            await tx.eventRepo.createGeneric(
              {
                id,
                type: "tool_call_result",
                toolName: ev.toolName,
                toolCallId: ev.toolCallId,
                content: ev.content,
              },
              tx
            )
          } else if (ev?.type === "reasoning") {
            await tx.eventRepo.createGeneric(
              { id, type: "reasoning", summary: ev.summary },
              tx
            )
          } else if (ev?.type === "system_prompt") {
            await tx.eventRepo.createGeneric(
              { id, type: "system_prompt", content: ev.content },
              tx
            )
          } else if (ev?.type === "user_message") {
            await tx.eventRepo.createGeneric(
              { id, type: "user_message", content: ev.content },
              tx
            )
          } else if (ev?.type === "status") {
            await tx.eventRepo.createGeneric(
              { id, type: "status", content: ev.content },
              tx
            )
          } else if (ev?.type === "llm.started") {
            await tx.eventRepo.createGeneric(
              { id, type: "llm.started", content: ev.content },
              tx
            )
          } else if (ev?.type === "llm.completed") {
            await tx.eventRepo.createGeneric(
              { id, type: "llm.completed", content: ev.content },
              tx
            )
          }

          if (workflowId) {
            await tx.eventRepo.appendToWorkflowEnd(
              workflowId,
              id,
              undefined,
              tx
            )
          }
        })
      },
    })
  } else {
    // Fallback: run generic ingestion loop requires a specific stream; left as future enhancement
    console.error(
      "No EVENTS_STREAM_KEY provided; cannot start ingestion loop without known stream key."
    )
    process.exit(1)
  }
}

void main()
