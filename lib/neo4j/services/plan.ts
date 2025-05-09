import { int, ManagedTransaction } from "neo4j-driver"

import { n4j } from "@/lib/neo4j/client"
import * as planRepo from "@/lib/neo4j/repositories/plan"
import { LLMResponseWithPlan } from "@/lib/types"

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
        const planNode = await planRepo.labelEventAsPlan(tx, {
          eventId,
          status: "draft",
          version: int(1),
        })

        // Create relationship
        await planRepo.createPlanImplementsIssue(tx, {
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
