import type { WorkflowEvent } from "@shared/entities/events/WorkflowEvent"

/**
 * Port for emitting workflow events to an event bus.
 *
 * Clean-architecture note: this abstracts the transport (Redis Streams, etc.).
 */
export interface EventBusPort {
  /**
   * Publish a workflow event to the event stream for the given workflowId.
   */
  publish(workflowId: string, event: WorkflowEvent): Promise<void>
}

