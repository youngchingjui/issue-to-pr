import type { EventRepository } from "@shared/ports/repositories/event.writer"

export interface TxContext {
  eventRepo: EventRepository
}

export interface UnitOfWork {
  withTransaction<T>(fn: (tx: TxContext) => Promise<T>): Promise<T>
}
