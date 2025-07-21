import { int, Integer, ManagedTransaction, Node } from "neo4j-driver"
import { ZodError } from "zod"

import { toAppIssue } from "@/lib/neo4j/repositories/issue"
import { Issue as AppIssue, WorkflowRun as AppWorkflowRun } from "@/lib/types"
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

// ---- Constants -------------------------------------------------------------
// One hour in milliseconds – after this period a running workflow is
// considered to have timed-out.
const WORKFLOW_TIMEOUT_MS = 60 * 60 * 1000 // 1 hour

// ----------------------------------------------------------------------------
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

// ---- Helpers ---------------------------------------------------------------
/**
 * Derive the effective state for a workflow run, automatically converting a
 * long-running "running" state into "timedOut" when it exceeds the timeout
 * threshold.
 */
function deriveState(state: WorkflowRunState, createdAt: Date): WorkflowRunState {
  if (state === "running") {
    const ageMs = Date.now() - createdAt.getTime()
    if (ageMs > WORKFLOW_TIMEOUT_MS) {
      return "timedOut"
    }
  }
  return state
}

// Modified: Now includes the issue as an extra field per workflow run
export async function listAll(
  tx: ManagedTransaction
): Promise<(WorkflowRun & { state: WorkflowRunState; issue?: AppIssue })[]> {
  const result = await tx.run<{
    w: Node<Integer, WorkflowRun, "WorkflowRun">
    state: WorkflowRunState
    i: Node<Integer, Issue, "Issue"> | null
  }>(
    `MATCH (w:WorkflowRun)
    OPTIONAL MATCH (w)-[:STARTS_WITH|NEXT*]->(e:Event {type: 'workflowState'})
    OPTIONAL MATCH (w)-[:BASED_ON_ISSUE]->(i:Issue)
    WITH w, e, i
    ORDER BY e.createdAt DESC
    WITH w, collect(e)[0] as latestWorkflowState, collect(i)[0] as issue
    RETURN w, latestWorkflowState.state AS state, issue as i
    `
  )

  return result.records.map((record) => {
    const run = workflowRunSchema.parse(record.get("w").properties)
    const stateParse = workflowRunStateSchema.safeParse(record.get("state"))
    const rawState: WorkflowRunState = stateParse.success ? stateParse.data : "completed"
    const derivedState = deriveState(rawState, run.createdAt.toStandardDate())

    const issueNode = record.get("i")
    const issueVal =
      issueNode && issueNode.properties
        ? toAppIssue(issueSchema.parse(issueNode.properties))
        : undefined
    return {
      ...run,
      state: derivedState,
      issue: issueVal,
    }
  })
}

export async function listForIssue(
  tx: ManagedTransaction,
  issue: Issue
): Promise<(WorkflowRun & { state: WorkflowRunState; issue?: AppIssue })[]> {
  const result = await tx.run<{
    w: Node<Integer, WorkflowRun, "WorkflowRun">
    state: WorkflowRunState
    i: Node<Integer, Issue, "Issue"> | null
  }>(
    `MATCH (w:WorkflowRun)-[:BASED_ON_ISSUE]->(i:Issue {number: $issue.number, repoFullName: $issue.repoFullName})
    OPTIONAL MATCH (w)-[:STARTS_WITH|NEXT*]->(e:Event {type: 'workflowState'})
    WITH w, e, i
    ORDER BY e.createdAt DESC
    WITH w, collect(e)[0] as latestWorkflowState, i
    RETURN w, latestWorkflowState.state AS state, i
    `,
    { issue }
  )

  return result.records.map((record) => {
    const run = workflowRunSchema.parse(record.get("w").properties)
    const stateParse = workflowRunStateSchema.safeParse(record.get("state"))
    const rawState: WorkflowRunState = stateParse.success ? stateParse.data : "completed"
    const derivedState = deriveState(rawState, run.createdAt.toStandardDate())

    const issueNode = record.get("i")
    const issueVal =
      issueNode && issueNode.properties
        ? toAppIssue(issueSchema.parse(issueNode.properties))
        : undefined
    return {
      ...run,
      state: derivedState,
      issue: issueVal,
    }
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

