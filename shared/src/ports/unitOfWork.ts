import type { EventRepository } from "./repositories/event.writer"

export interface TxContext {
  eventRepo: EventRepository
}

export interface UnitOfWork {
  withTransaction<T>(fn: (tx: TxContext) => Promise<T>): Promise<T>
}

