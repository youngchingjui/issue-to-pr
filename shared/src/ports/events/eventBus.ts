import type { MessageEvent } from "@shared/entities/events/MessageEvent"
import type { WorkflowEvent } from "@shared/entities/events/WorkflowEvent"

export type AnyEvent = WorkflowEvent | MessageEvent

/**
 * Port for emitting workflow events to an event bus.
 *
 * Clean-architecture note: this abstracts the transport (Redis Streams, etc.).
 */
export interface EventBusPort {
  /**
   * Publish an event (workflow or message) to the event stream for the given workflowId.
   */
  publish(workflowId: string, event: AnyEvent): Promise<void>
}
