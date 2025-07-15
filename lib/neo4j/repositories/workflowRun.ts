import { int, Integer, ManagedTransaction, Node } from "neo4j-driver"
import { ZodError } from "zod"

import { WorkflowRun as AppWorkflowRun } from "@/lib/types"
import {
  AnyEvent,
  anyEventSchema,
  Issue,
  issueSchema,
  LLMResponseWithPlan,
  llmResponseWithPlanSchema,
  WorkflowRun,
  workflowRunSchema,
  WorkflowRunState,
  workflowRunStateSchema,
} from "@/lib/types/db/neo4j"

export async function create(
  tx: ManagedTransaction,
  workflowRun: Omit<WorkflowRun, "createdAt">
): Promise<WorkflowRun> {
  const result = await tx.run<{ w: Node<Integer, WorkflowRun, "WorkflowRun"> }>(
    `
    CREATE (w:WorkflowRun {id: $id, type: $type, createdAt: datetime(), postToGithub: $postToGithub}) 
    RETURN w
    `,
    {
      id: workflowRun.id,
      type: workflowRun.type,
      postToGithub: workflowRun.postToGithub ?? null,
    }
  )
  return workflowRunSchema.parse(result.records[0].get("w").properties)
}

export async function get(
  tx: ManagedTransaction,
  id: string
): Promise<WorkflowRun | null> {
  const result = await tx.run<{ w: Node<Integer, WorkflowRun, "WorkflowRun"> }>(
    `MATCH (w:WorkflowRun {id: $id}) RETURN w LIMIT 1`,
    { id }
  )
  const raw = result.records[0]?.get("w")?.properties
  return raw ? workflowRunSchema.parse(raw) : null
}

export async function listAll(
  tx: ManagedTransaction
): Promise<(WorkflowRun & { state: WorkflowRunState, issueNumber?: Integer, repoFullName?: string })[]> {
  const result = await tx.run<{
    w: Node<Integer, WorkflowRun, "WorkflowRun">
    state: WorkflowRunState
    issueNumber?: Integer
    repoFullName?: string
  }>(
    `MATCH (w:WorkflowRun)
    OPTIONAL MATCH (w)-[:BASED_ON_ISSUE]->(i:Issue)
    OPTIONAL MATCH (w)-[:STARTS_WITH|NEXT*]->(e:Event {type: 'workflowState'})
    WITH w, e, i
    ORDER BY e.createdAt DESC
    WITH w, collect(e)[0] as latestWorkflowState, i
    RETURN w, latestWorkflowState.state AS state, i.number AS issueNumber, i.repoFullName AS repoFullName
    `
  )

  return result.records.map((record) => {
    const run = workflowRunSchema.parse(record.get("w").properties)
    const state = workflowRunStateSchema.safeParse(record.get("state"))
    const issueNumber = record.get("issueNumber")
    const repoFullName = record.get("repoFullName")
    return { 
      ...run, 
      state: state.success ? state.data : "completed",
      ...(issueNumber !== null && issueNumber !== undefined ? { issueNumber } : {}),
      ...(repoFullName ? { repoFullName } : {}),
    }
  })
}

export async function listForIssue(
  tx: ManagedTransaction,
  issue: Issue
): Promise<(WorkflowRun & { state: WorkflowRunState })[]> {
  const result = await tx.run<{
    w: Node<Integer, WorkflowRun, "WorkflowRun">
    state: WorkflowRunState
  }>(
    `MATCH (w:WorkflowRun)-[:BASED_ON_ISSUE]->(i:Issue {number: $issue.number, repoFullName: $issue.repoFullName})
    OPTIONAL MATCH (w)-[:STARTS_WITH|NEXT*]->(e:Event {type: 'workflowState'})
    WITH w, e
    ORDER BY e.createdAt DESC
    WITH w, collect(e)[0] as latestWorkflowState
    RETURN w, latestWorkflowState.state AS state
    `,
    { issue }
  )

  return result.records.map((record) => {
    const run = workflowRunSchema.parse(record.get("w").properties)
    const state = workflowRunStateSchema.safeParse(record.get("state"))
    return { ...run, state: state.success ? state.data : "completed" }
  })
}

export async function linkToIssue(
  tx: ManagedTransaction,
  {
    workflowId,
    issueId,
    repoFullName,
  }: { workflowId: string; issueId: number; repoFullName: string }
) {
  const result = await tx.run(
    `
    MATCH (w:WorkflowRun {id: $workflowId}), (i:Issue {number: $issueId, repoFullName: $repoFullName}) 
    CREATE (w)-[:BASED_ON_ISSUE]->(i)
    RETURN w, i
    `,
    { workflowId, issueId: int(issueId), repoFullName }
  )
  return result
}

/**
 * Helper function to parse AnyEvent + LLMResponseWithPlan
 * LLMResponseWithPlan is a superset of LLMResponse, so it needs to be parsed first.
 */
function parseEventWithPlan(event: AnyEvent | LLMResponseWithPlan) {
  try {
    return llmResponseWithPlanSchema.parse(event)
  } catch (e) {
    if (e instanceof ZodError) {
      return anyEventSchema.parse(event)
    }
    throw e
  }
}

/**
 * Retrieves a WorkflowRun with its associated events and issue, including
 * the labels for each event.
 */
export async function getWithDetails(
  tx: ManagedTransaction,
  workflowRunId: string
): Promise<{
  workflow: WorkflowRun
  issue?: Issue
  events: (AnyEvent | LLMResponseWithPlan)[]
}> {
  const result = await tx.run<{
    w: Node<Integer, WorkflowRun, "WorkflowRun">
    i: Node<Integer, Issue, "Issue">
    events: Node<Integer, AnyEvent | LLMResponseWithPlan, "Event">[]
  }>(
    `
      MATCH (w:WorkflowRun {id: $workflowRunId})
      OPTIONAL MATCH (i:Issue)<-[:BASED_ON_ISSUE]-(w)
      OPTIONAL MATCH (w)-[:STARTS_WITH|NEXT*]-(e:Event)
      WITH w, i, collect(e) as events
      RETURN w, i, events
      `,
    { workflowRunId }
  )
  const record = result.records[0]
  return {
    workflow: workflowRunSchema.parse(record.get("w").properties),
    issue: record.get("i")?.properties
      ? issueSchema.parse(record.get("i").properties)
      : undefined,
    events: record
      .get("events")
      .map((item) => parseEventWithPlan(item.properties)),
  }
}

export async function mergeIssueLink(
  tx: ManagedTransaction,
  {
    workflowRun,
    issue,
  }: {
    workflowRun: Omit<WorkflowRun, "createdAt">
    issue: Issue
  }
): Promise<{ run: WorkflowRun; issue: Issue }> {
  const result = await tx.run(
    `
    MERGE (w:WorkflowRun {id: $workflowRun.id})
      ON CREATE SET w.type = $workflowRun.type, w.createdAt = datetime(), w.postToGithub = $workflowRun.postToGithub
    MERGE (i:Issue {repoFullName: $issue.repoFullName, number: $issue.number})
    MERGE (w)-[:BASED_ON_ISSUE]->(i)
    RETURN w, i
    `,
    {
      workflowRun,
      issue,
    }
  )
  const run = workflowRunSchema.parse(result.records[0].get("w").properties)
  const parsedIssue = issueSchema.parse(result.records[0].get("i").properties)
  return { run, issue: parsedIssue }
}

export const toAppWorkflowRun = (dbRun: WorkflowRun): AppWorkflowRun => {
  // NOTE: Currently there's no transformation needed.
  // This function is placeholder for future transformations.
  return {
    ...dbRun,
    createdAt: dbRun.createdAt.toStandardDate(),
  }
}

