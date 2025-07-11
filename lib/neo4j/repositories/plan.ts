import { int, Integer, ManagedTransaction, Node } from "neo4j-driver"
import { z } from "zod"

import { Plan as AppPlan } from "@/lib/types"
import {
  Issue,
  issueSchema,
  LLMResponseWithPlan,
  llmResponseWithPlanSchema,
  Plan,
  planSchema,
  WorkflowRun,
  workflowRunSchema,
} from "@/lib/types/db/neo4j"

// Retrieve Event node by id
export async function getEventById(
  tx: ManagedTransaction,
  { eventId }: { eventId: string }
) {
  //TODO: Implement this
}

export async function listPlansForIssue(
  tx: ManagedTransaction,
  { repoFullName, issueNumber }: { repoFullName: string; issueNumber: number }
) {
  const result = await tx.run<{
    p: Node<Integer, Plan | LLMResponseWithPlan, "Plan">
  }>(
    `
    MATCH (p:Plan)-[:IMPLEMENTS]->(i:Issue {number: $issueNumber, repoFullName: $repoFullName})
    RETURN p
    `,
    { repoFullName, issueNumber }
  )

  return result.records.map((record) => {
    const raw = record.get("p")?.properties
    return z.union([planSchema, llmResponseWithPlanSchema]).parse(raw)
  })
}

// Add :Plan label and properties to Event node
export async function labelEventAsPlan(
  tx: ManagedTransaction,
  {
    eventId,
    status = "draft",
    version = int(1),
  }: { eventId: string; status?: string; version?: Integer }
): Promise<LLMResponseWithPlan> {
  const result = await tx.run<{
    e: Node<Integer, LLMResponseWithPlan, "Event | Plan">
  }>(
    `MATCH (e:Event {id: $eventId})
     SET e:Plan
     SET e.status = $status
     SET e.version = $version
     RETURN e`,
    { eventId, status, version }
  )

  const raw = result.records[0]?.get("e")?.properties
  return llmResponseWithPlanSchema.parse(raw)
}

// Create :IMPLEMENTS relationship from Plan to Issue
export async function createPlanImplementsIssue(
  tx: ManagedTransaction,
  {
    eventId,
    issueNumber,
    repoFullName,
  }: { eventId: string; issueNumber: Integer; repoFullName: string }
): Promise<{ plan: Plan | LLMResponseWithPlan; issue: Issue }> {
  const result = await tx.run<{
    p: Node<Integer, Plan | LLMResponseWithPlan, "Plan">
    i: Node<Integer, Issue, "Issue">
  }>(
    `MATCH (p:Plan {id: $eventId})
    OPTIONAL MATCH(i:Issue {number: $issueNumber, repoFullName: $repoFullName})
     CREATE (p)-[:IMPLEMENTS]->(i)
     RETURN p, i`,
    { eventId, issueNumber, repoFullName }
  )
  const p = result.records[0]?.get("p")?.properties
  const i = result.records[0]?.get("i")?.properties

  return {
    plan: z.union([planSchema, llmResponseWithPlanSchema]).parse(p),
    issue: issueSchema.parse(i),
  }
}

// Convert db-level Plan to app-level Plan (currently passthrough, but for future-proofing)
export const toAppPlan = (dbPlan: Plan): AppPlan => {
  return {
    ...dbPlan,
    version: dbPlan.version.toNumber(),
    createdAt: dbPlan.createdAt.toStandardDate(),
  }
}

// Get Plan and related nodes by planId
export async function getPlanWithDetails(
  tx: ManagedTransaction,
  { planId }: { planId: string }
) {
  const result = await tx.run<{
    p: Node<Integer, Plan | LLMResponseWithPlan, "Plan">
    w: Node<Integer, WorkflowRun, "WorkflowRun">
    i: Node<Integer, Issue, "Issue">
  }>(
    `
    MATCH (p:Plan {id: $planId})-[:IMPLEMENTS]->(i:Issue)<-[:BASED_ON_ISSUE]-(w:WorkflowRun)
    RETURN p, w, i
    `,
    { planId }
  )

  const raw = result.records[0]

  return {
    plan: planSchema.parse(raw.get("p")?.properties),
    workflow: workflowRunSchema.parse(raw.get("w")?.properties),
    issue: issueSchema.parse(raw.get("i")?.properties),
  }
}

// Batch plan status for multiple issues
export async function listPlanStatusForIssues(
  tx: ManagedTransaction,
  {
    repoFullName,
    issueNumbers,
  }: { repoFullName: string; issueNumbers: number[] }
): Promise<Record<number, boolean>> {
  if (!issueNumbers.length) return {}
  const cypher = `
    MATCH (i:Issue)
    WHERE i.repoFullName = $repoFullName AND i.number IN $issueNumbers
    OPTIONAL MATCH (p:Plan)-[:IMPLEMENTS]->(i)
    RETURN i.number AS number, count(p) > 0 AS hasPlan
  `
  const result = await tx.run(cypher, { repoFullName, issueNumbers })
  const status: Record<number, boolean> = {}
  for (const record of result.records) {
    status[record.get("number")] = record.get("hasPlan")
  }
  return status
}

// Batch latest plan ID for multiple issues
export async function listLatestPlanIdsForIssues(
  tx: ManagedTransaction,
  {
    repoFullName,
    issueNumbers,
  }: { repoFullName: string; issueNumbers: number[] }
): Promise<Record<number, string | null>> {
  if (!issueNumbers.length) return {}
  const cypher = `
    MATCH (i:Issue)
    WHERE i.repoFullName = $repoFullName AND i.number IN $issueNumbers
    OPTIONAL MATCH (p:Plan)-[:IMPLEMENTS]->(i)
    WITH i.number AS number, p
    ORDER BY p.createdAt DESC
    RETURN number, head(collect(p.id)) AS planId
  `
  const result = await tx.run(cypher, { repoFullName, issueNumbers })
  const planIds: Record<number, string | null> = {}
  for (const record of result.records) {
    planIds[record.get("number")] = record.get("planId") || null
  }
  return planIds
}
