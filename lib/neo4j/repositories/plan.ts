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
} from "@/lib/types/db/neo4j"

// Retrieve Event node by id
export async function getEventById(
  tx: ManagedTransaction,
  { eventId }: { eventId: string }
) {
  //TODO: Implement this
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
