// Lightweight, in-process event bus for the Next.js app.
// NOTE: This is intentionally scoped to the web app process only. If/when we
// need cross-app or cross-process eventing (e.g., workers), we will introduce a
// different transport (Redis, NATS, etc.) and likely house that in /shared.
// For now, this helps us fan-out GitHub webhook events to multiple handlers
// while keeping strong typing inside the app.

export type Handler<T> = (event: T) => Promise<void> | void

export class EventBus<E extends { type: string }> {
  // Store handlers as functions accepting the full event union E.
  private handlers = new Map<E["type"], Array<(e: E) => Promise<void> | void>>()

  on<T extends E["type"]>(type: T, handler: Handler<Extract<E, { type: T }>>) {
    const list = this.handlers.get(type) ?? []
    // Wrap the narrowed handler to accept the full union at runtime
    const wrapped = (e: E) => handler(e as Extract<E, { type: T }>)
    list.push(wrapped)
    this.handlers.set(type, list)
  }

  async emit(event: E) {
    const list = this.handlers.get(event.type) ?? []
    await Promise.all(list.map((h) => h(event)))
  }
}

