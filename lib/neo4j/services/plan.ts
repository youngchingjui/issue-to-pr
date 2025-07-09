import { int, ManagedTransaction } from "neo4j-driver"
import { n4j } from "@/lib/neo4j/client"
import { toAppIssue } from "@/lib/neo4j/repositories/issue"
import {
  createPlanImplementsIssue,
  createPlanVersion as dbCreatePlanVersion,
  getPlanWithDetails as dbGetPlanWithDetails,
  labelEventAsPlan,
  listPlansForIssue as dbListPlansForIssue,
  listPlanStatusForIssues as dbListPlanStatusForIssues,
  toAppPlan,
} from "@/lib/neo4j/repositories/plan"
import { toAppWorkflowRun } from "@/lib/neo4j/repositories/workflowRun"
import { Issue, LLMResponseWithPlan, Plan, WorkflowRun } from "@/lib/types"

export async function listPlansForIssue({
  repoFullName,
  issueNumber,
}: {
  repoFullName: string
  issueNumber: number
}) {
  const session = await n4j.getSession()

  try {
    const result = await session.executeRead(async (tx: ManagedTransaction) => {
      return await dbListPlansForIssue(tx, {
        repoFullName,
        issueNumber,
      })
    })
    return result.map(toAppPlan)
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
    const result = await session.executeWrite(
      async (tx: ManagedTransaction) => {
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
      }
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
    const result = await session.executeRead(async (tx: ManagedTransaction) => {
      return await dbGetPlanWithDetails(tx, { planId })
    })

    return {
      plan: toAppPlan(result.plan),
      workflow: toAppWorkflowRun(result.workflow),
      issue: toAppIssue(result.issue),
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
    return await session.executeRead(async (tx: ManagedTransaction) => {
      return await dbListPlanStatusForIssues(tx, { repoFullName, issueNumbers })
    })
  } finally {
    await session.close()
  }
}

// --- New: Plan version Server Action ---
export async function createPlanVersionServer({
  planId,
  workflowId,
  content,
}: {
  planId?: string
  workflowId?: string
  content: string
}): Promise<Plan> {
  const session = await n4j.getSession()
  try {
    return await session.executeWrite(async (tx: ManagedTransaction) => {
      return await dbCreatePlanVersion(tx, { planId, workflowId, content })
    })
  } finally {
    await session.close()
  }
}

