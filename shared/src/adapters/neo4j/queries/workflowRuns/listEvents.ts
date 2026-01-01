import { Integer, ManagedTransaction, Node, QueryResult } from "neo4j-driver"

import { AnyEvent } from "@/shared/adapters/neo4j/types"

const QUERY = `
  MATCH (w:WorkflowRun {id: $workflowRunId})-[:STARTS_WITH|NEXT*]->(e:Event)
  RETURN e
  ORDER BY e.createdAt ASC
`

export interface ListEventsForWorkflowRunParams {
  workflowRunId: string
}

export interface ListEventsForWorkflowRunResult {
  e: Node<Integer, AnyEvent, "Event">
}

export async function listEventsForWorkflowRun(
  tx: ManagedTransaction,
  params: ListEventsForWorkflowRunParams
): Promise<QueryResult<ListEventsForWorkflowRunResult>> {
  return await tx.run<ListEventsForWorkflowRunResult>(QUERY, params)
}
