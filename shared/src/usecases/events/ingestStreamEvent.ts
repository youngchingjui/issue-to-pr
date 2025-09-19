import { tryParseStreamEvent } from "@shared/entities/events/contracts"
import type {
  EventStreamConsumerPort,
  StreamMessage,
} from "@shared/ports/events/consumer"
import type { UnitOfWork } from "@shared/ports/unitOfWork"
import type { Clock } from "@shared/ports/utils/clock"
import type { IdGenerator } from "@shared/ports/utils/id"

type PortDependencies = {
  consumer: EventStreamConsumerPort
  uow: UnitOfWork
  idGen: IdGenerator
  clock: Clock
}

/**
 * Run a consumer loop that persists Redis stream events into Neo4j.
 * Stream key convention: workflow:{workflowId}:events
 */
export async function runEventIngestion(
  ports: PortDependencies,
  opts: {
    group: string
    consumerName: string
    blockMs?: number
    count?: number
  }
): Promise<never> {
  const { consumer, uow, idGen } = ports

  return consumer.readGroup({
    stream: "workflow:*:events", // Note: adapter will receive a concrete stream; callers may provide specific keys
    group: opts.group,
    consumer: opts.consumerName,
    blockMs: opts.blockMs,
    count: opts.count,
    onMessage: async (msg: StreamMessage) => {
      // Extract workflowId from stream name: workflow:{workflowId}:events
      const match = /^workflow:([^:]+):events$/.exec(msg.stream)
      const workflowId = match?.[1]

      // Validate and narrow the incoming event payload using transport contracts
      const event = tryParseStreamEvent(msg.event)

      await uow.withTransaction(async (tx) => {
        // Assign an event id for persistence
        const eventId = idGen.next()
        const parentId = undefined // future: read from metadata

        if (event && event.type === "assistant_message") {
          await tx.eventRepo.createGeneric(
            {
              id: eventId,
              type: "assistant_message",
              content: event.content,
              model: event.model,
            },
            tx
          )
        } else if (event && event.type === "tool_call") {
          await tx.eventRepo.createGeneric(
            {
              id: eventId,
              type: "tool_call",
              toolName: event.toolName,
              toolCallId: event.toolCallId,
              args: event.args,
            },
            tx
          )
        } else if (event && event.type === "tool_call_result") {
          await tx.eventRepo.createGeneric(
            {
              id: eventId,
              type: "tool_call_result",
              toolName: event.toolName,
              toolCallId: event.toolCallId,
              content: event.content,
            },
            tx
          )
        } else if (event && event.type === "reasoning") {
          await tx.eventRepo.createGeneric(
            { id: eventId, type: "reasoning", summary: event.summary },
            tx
          )
        } else if (event && event.type === "system_prompt") {
          await tx.eventRepo.createGeneric(
            { id: eventId, type: "system_prompt", content: event.content },
            tx
          )
        } else if (event && event.type === "user_message") {
          await tx.eventRepo.createGeneric(
            { id: eventId, type: "user_message", content: event.content },
            tx
          )
        } else if (event && event.type === "status") {
          await tx.eventRepo.createGeneric(
            { id: eventId, type: "status", content: event.content },
            tx
          )
        } else if (event && event.type === "llm.started") {
          await tx.eventRepo.createGeneric(
            { id: eventId, type: "llm.started", content: event.content },
            tx
          )
        } else if (event && event.type === "llm.completed") {
          await tx.eventRepo.createGeneric(
            { id: eventId, type: "llm.completed", content: event.content },
            tx
          )
        } else if (event === null) {
          // Fallback: persist unknown raw payload as status
          const raw =
            typeof msg.event === "string"
              ? msg.event
              : JSON.stringify(msg.event)
          await tx.eventRepo.createGeneric(
            { id: eventId, type: "status", content: String(raw) },
            tx
          )
        }

        if (workflowId) {
          await tx.eventRepo.appendToWorkflowEnd(
            workflowId,
            eventId,
            parentId,
            tx
          )
        }
      })
    },
  })
}
