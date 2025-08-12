import { int, ManagedTransaction } from "neo4j-driver"

import { n4j } from "@/lib/neo4j/client"
import { neo4jToJs } from "@/lib/neo4j/convert"
import {
  createPlanImplementsIssue,
  getPlanWithDetails as dbGetPlanWithDetails,
  labelEventAsPlan,
  listLatestPlanIdsForIssues as dbListLatestPlanIdsForIssues,
  listPlansForIssue as dbListPlansForIssue,
  listPlanStatusForIssues as dbListPlanStatusForIssues,
} from "@/lib/neo4j/repositories/plan"
import {
  Issue,
  issueSchema,
  LLMResponseWithPlan,
  Plan,
  planSchema,
  WorkflowRun,
  workflowRunSchema,
} from "@/lib/types"
import { withTiming } from "@/lib/utils/telemetry"

export async function listPlansForIssue({
  repoFullName,
  issueNumber,
}: {
  repoFullName: string
  issueNumber: number
}): Promise<Plan[]> {
  const session = await n4j.getSession()

  try {
    const result = await withTiming(
      `Neo4j READ: listPlansForIssue ${repoFullName}#${issueNumber}`,
      async () =>
        session.executeRead(async (tx: ManagedTransaction) => {
          return await dbListPlansForIssue(tx, {
            repoFullName,
            issueNumber,
          })
        })
    )

    return result.map(neo4jToJs).map((plan) => planSchema.parse(plan))
  } finally {
    await session.close()
  }
}

/**
 * Finds an existing event by eventId and labels it as a Plan, attaching default plan metadata (status, version, etc).
 * Then, links the labeled e:Event:Plan node to the underlying Issue node in the graph.
 */
export async function tagMessageAsPlan({
  eventId,
  workflowId,
  issueNumber,
  repoFullName,
}: {
  eventId: string
  workflowId: string
  issueNumber: number
  repoFullName: string
}): Promise<LLMResponseWithPlan> {
  const session = await n4j.getSession()
  try {
    const result = await withTiming(
      `Neo4j WRITE: tagMessageAsPlan ${repoFullName}#${issueNumber}`,
      async () =>
        session.executeWrite(async (tx: ManagedTransaction) => {
          // Label as Plan
          const planNode = await labelEventAsPlan(tx, {
            eventId,
            status: "draft",
            version: int(1),
          })

          // Create relationship
          await createPlanImplementsIssue(tx, {
            eventId,
            issueNumber: int(issueNumber),
            repoFullName,
          })

          return planNode
        })
    )

    return {
      plan: {
        id: result.id,
        status: result.status,
        version: result.version.toNumber(),
        editMessage: result.editMessage,
      },
      workflowId,
      id: result.id,
      content: result.content,
      type: "llmResponseWithPlan",
      createdAt: result.createdAt.toStandardDate(),
    }
  } finally {
    await session.close()
  }
}

export async function getPlanWithDetails(
  planId: string
): Promise<{ plan: Plan; workflow: WorkflowRun; issue: Issue }> {
  const session = await n4j.getSession()
  try {
    const result = await withTiming(
      `Neo4j READ: getPlanWithDetails ${planId}`,
      async () =>
        session.executeRead(async (tx: ManagedTransaction) => {
          return await dbGetPlanWithDetails(tx, { planId })
        })
    )

    return {
      plan: planSchema.parse(neo4jToJs(result.plan)),
      workflow: workflowRunSchema.parse(neo4jToJs(result.workflow)),
      issue: issueSchema.parse(neo4jToJs(result.issue)),
    }
  } finally {
    await session.close()
  }
}

// Batch plan status for multiple issues (service level)
export async function getPlanStatusForIssues({
  repoFullName,
  issueNumbers,
}: {
  repoFullName: string
  issueNumbers: number[]
}): Promise<Record<number, boolean>> {
  if (!issueNumbers.length) return {}
  const session = await n4j.getSession()
  try {
    return await withTiming(
      `Neo4j READ: listPlanStatusForIssues ${repoFullName}`,
      async () =>
        session.executeRead(async (tx: ManagedTransaction) => {
          return await dbListPlanStatusForIssues(tx, { repoFullName, issueNumbers })
        }),
      { count: issueNumbers.length }
    )
  } finally {
    await session.close()
  }
}

// Batch latest plan IDs for multiple issues (service level)
export async function getLatestPlanIdsForIssues({
  repoFullName,
  issueNumbers,
}: {
  repoFullName: string
  issueNumbers: number[]
}): Promise<Record<number, string | null>> {
  if (!issueNumbers.length) return {}
  const session = await n4j.getSession()
  try {
    return await withTiming(
      `Neo4j READ: listLatestPlanIdsForIssues ${repoFullName}`,
      async () =>
        session.executeRead(async (tx: ManagedTransaction) => {
          return await dbListLatestPlanIdsForIssues(tx, {
            repoFullName,
            issueNumbers,
          })
        }),
      { count: issueNumbers.length }
    )
  } finally {
    await session.close()
  }
}

