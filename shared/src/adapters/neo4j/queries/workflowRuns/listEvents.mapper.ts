import { QueryResult } from "neo4j-driver"

import { WorkflowEventInput } from "@/ports/db"

import { anyEventSchema } from "../../types"
import { ListEventsForWorkflowRunResult } from "./listEvents"

export function mapListEventsResult(
  result: QueryResult<ListEventsForWorkflowRunResult>
): WorkflowEventInput[] {
  return result.records.map((record) => {
    const event = anyEventSchema.parse(record.get("e").properties)
    return {
      type: event.type,
      payload: event.content,
      createdAt: event.createdAt.toString(),
    }
  })
}
