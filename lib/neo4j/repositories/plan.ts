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

// --- New function: createPlanVersion ---
export async function createPlanVersion(
  tx: ManagedTransaction,
  {
    planId,
    workflowId,
    content,
  }: { planId?: string; workflowId?: string; content: string }
): Promise<Plan> {
  // Only one of planId or workflowId must be provided
  if (!!planId === !!workflowId) {
    throw new Error("Provide exactly one of planId or workflowId")
  }
  // 1. Find the previous/latest plan
  let prevPlan: Node<Integer, Plan> | undefined
  let version = 1
  if (planId) {
    // Find Plan by planId
    const prevRes = await tx.run<{ p: Node<Integer, Plan, "Plan"> }>(
      `MATCH (p:Plan {id: $planId}) RETURN p`,
      { planId }
    )
    prevPlan = prevRes.records[0]?.get("p")
    if (!prevPlan) throw new Error("Could not find Plan with id " + planId)
    version = prevPlan.properties.version.toNumber() + 1
  } else {
    // Find latest Plan for workflowId (by highest version)
    const prevRes = await tx.run<{ p: Node<Integer, Plan, "Plan"> }>(
      `MATCH (w:WorkflowRun {id: $workflowId})<-[:BASED_ON_ISSUE]-(i:Issue)<-[:IMPLEMENTS]-(p:Plan)
       RETURN p ORDER BY p.version DESC LIMIT 1`,
      { workflowId }
    )
    prevPlan = prevRes.records[0]?.get("p")
    if (!prevPlan) {
      // No plan yet for this workflow
      version = 1
    } else {
      version = prevPlan.properties.version.toNumber() + 1
    }
  }
  // 2. Create new Plan node
  const newPlanId = crypto.randomUUID()
  const now = new Date().toISOString()
  const createRes = await tx.run<{ p: Node<Integer, Plan, "Plan"> }>(
    `CREATE (p:Plan {id: $newPlanId, content: $content, status: 'draft', version: $version, createdAt: datetime($now)}) RETURN p`,
    { newPlanId, content, version: int(version), now }
  )
  const newPlan = createRes.records[0]?.get("p") as Node<Integer, Plan>
  if (!newPlan) throw new Error("Failed to create new plan node")
  // 3. Link to previous Plan via NEXT_VERSION (if any)
  if (prevPlan) {
    await tx.run(
      `MATCH (prev:Plan {id: $prevId}), (next:Plan {id: $nextId})
       CREATE (prev)-[:NEXT_VERSION]->(next)`,
      { prevId: prevPlan.properties.id, nextId: newPlanId }
    )
  }
  // 4. Optionally, copy IMPLMENTS/other relationships
  if (planId && prevPlan) {
    // If planId given, connect new plan to same Issue as prevPlan
    await tx.run(
      `MATCH (prev:Plan {id: $prevId})-[:IMPLEMENTS]->(i:Issue), (next:Plan {id: $nextId})
       CREATE (next)-[:IMPLEMENTS]->(i)`,
      { prevId: planId, nextId: newPlanId }
    )
  } else if (workflowId && prevPlan) {
    // For workflowId, inherit IMPLMENTS if prevPlan exists
    await tx.run(
      `MATCH (prev:Plan {id: $prevId})-[:IMPLEMENTS]->(i:Issue), (next:Plan {id: $nextId})
       CREATE (next)-[:IMPLEMENTS]->(i)`,
      { prevId: prevPlan.properties.id, nextId: newPlanId }
    )
  } else if (workflowId && !prevPlan) {
    // First plan for workflow; connect to underlying Issue
    await tx.run(
      `MATCH (w:WorkflowRun {id: $workflowId})<-[:BASED_ON_ISSUE]-(i:Issue), (next:Plan {id: $nextId})
       CREATE (next)-[:IMPLEMENTS]->(i)`,
      { workflowId, nextId: newPlanId }
    )
  }
  
  // 5. Return new plan (properties, not node)
  return planSchema.parse(newPlan.properties)
}

