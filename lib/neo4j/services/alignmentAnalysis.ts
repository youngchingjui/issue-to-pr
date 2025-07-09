import { v4 as uuidv4 } from "uuid"
import { int } from "neo4j-driver"
import { n4j } from "@/lib/neo4j/client"
import { createAlignmentAnalysis, linkAlignmentAnalysisNode } from "@/lib/neo4j/repositories/alignmentAnalysis"

/**
 * Save AlignmentAnalysis node and link to Issue, Plan, WorkflowRun as available.
 */
export async function saveAlignmentAnalysisNode({
  analysisContent,
  workflowId,
  relatedPlanId,
  issueNumber,
  repoFullName,
}: {
  analysisContent: string,
  workflowId: string,
  relatedPlanId?: string,
  issueNumber?: number,
  repoFullName?: string,
}): Promise<string> {
  const session = await n4j.getSession()
  const alignmentId = uuidv4()
  try {
    await session.executeWrite(async (tx) => {
      await createAlignmentAnalysis(tx, {
        id: alignmentId,
        content: analysisContent,
        workflowId,
        createdAt: new Date(),
        planId: relatedPlanId,
        issueNumber: issueNumber !== undefined ? int(issueNumber) : undefined,
        repoFullName,
      })
      await linkAlignmentAnalysisNode(tx, {
        alignmentId,
        planId: relatedPlanId,
        issueNumber: issueNumber !== undefined ? int(issueNumber) : undefined,
        repoFullName,
        workflowId,
      })
    })
    return alignmentId
  } finally {
    await session.close()
  }
}
