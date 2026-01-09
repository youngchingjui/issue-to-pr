import type {
  Integer,
  ManagedTransaction,
  Node,
  QueryResult,
} from "neo4j-driver"

import type { WorkflowRun as Neo4jWorkflowRun } from "../../types"

/**
 * Simple query to create a WorkflowRun node
 * All relationships (actor, issue, repository, commit) are attached separately
 * using the attach* functions for cleaner composition
 */
const QUERY = `
  CREATE (wr:WorkflowRun {
    id: $runId,
    type: $type,
    postToGithub: $postToGithub,
    createdAt: datetime()
  })
  RETURN wr
`

/**
 * Parameters for creating a workflow run
 * Core fields used in the creation query.
 *
 * Relationships (actor, issue, repository, commit) are attached separately in
 * `StorageAdapter` via the dedicated `attach*` queries.
 */
export interface CreateWorkflowRunParams {
  runId: string
  type: string
  postToGithub: boolean
}

export interface CreateWorkflowRunResult {
  wr: Node<Integer, Neo4jWorkflowRun, "WorkflowRun">
}

/**
 * Creates a WorkflowRun node in Neo4j
 * Does NOT create any relationships - use attach* functions for that
 */
export async function createWorkflowRun(
  tx: ManagedTransaction,
  params: CreateWorkflowRunParams
): Promise<QueryResult<CreateWorkflowRunResult>> {
  return await tx.run<CreateWorkflowRunResult>(QUERY, {
    runId: params.runId,
    type: params.type,
    postToGithub: params.postToGithub,
  })
}
