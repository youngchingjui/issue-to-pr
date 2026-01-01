import type { WorkflowEvent } from "@shared/ports/db"
import type { Record as Neo4jRecord } from "neo4j-driver"

export function mapListEvents(records: Neo4jRecord[]): WorkflowEvent[] {
  return records.map((r) => {
    const e = r.get("e") as any
    return {
      id: String(e.id ?? e.eventId ?? ""),
      type: String(e.type ?? e.eventType ?? "event"),
      createdAt: new Date(String(e.createdAt ?? Date.now())),
      data: e.data ?? null,
    }
  })
}
