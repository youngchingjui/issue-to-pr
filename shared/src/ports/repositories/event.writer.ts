import type { TxContext } from "@shared/ports/unitOfWork"

export interface EventRepository {
  /**
   * Create a Status event node.
   * Implementation should set createdAt in the persistence layer.
   */
  createStatus(
    ev: { id: string; content: string },
    tx: TxContext
  ): Promise<void>

  /**
   * Append the given event to the end of the workflow chain or link from parentId when provided.
   */
  appendToWorkflowEnd(
    workflowId: string,
    eventId: string,
    parentId: string | undefined,
    tx: TxContext
  ): Promise<void>
}
