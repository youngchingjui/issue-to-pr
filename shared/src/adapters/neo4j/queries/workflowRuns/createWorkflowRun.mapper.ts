import type { QueryResult } from "neo4j-driver"

import type { WorkflowRun } from "@/shared/entities/WorkflowRun"

import { workflowRunSchema } from "../../types"
import type {
  CreateWorkflowRunParams,
  CreateWorkflowRunResult,
} from "./createWorkflowRun"

/**
 * Maps Neo4j query result to domain WorkflowRun entity
 * Takes both the query result and input params to construct a complete entity
 */
export function mapCreateWorkflowRunResult(
  result: QueryResult<CreateWorkflowRunResult>,
  params: CreateWorkflowRunParams
): WorkflowRun {
  const record = result.records[0]
  const wrNode = record.get("wr")
  const wr = workflowRunSchema.parse(wrNode.properties)

  return {
    id: wr.id,
    type: wr.type,
    createdAt: wr.createdAt.toStandardDate(),
    postToGithub: wr.postToGithub ?? false,
    state: wr.state ?? "pending",
  }
}
