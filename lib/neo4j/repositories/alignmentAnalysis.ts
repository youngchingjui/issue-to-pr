import { ManagedTransaction, Integer } from "neo4j-driver"
import { alignmentAnalysisSchema, AlignmentAnalysis } from "@/lib/types/db/neo4j"

// Create an AlignmentAnalysis node
export async function createAlignmentAnalysis(
  tx: ManagedTransaction,
  { id, content, workflowId, createdAt, planId, issueNumber, repoFullName }: AlignmentAnalysis
): Promise<AlignmentAnalysis> {
  const cypher = `
    CREATE (a:AlignmentAnalysis {
      id: $id,
      content: $content,
      workflowId: $workflowId,
      createdAt: datetime($createdAt),
      planId: $planId,
      issueNumber: $issueNumber,
      repoFullName: $repoFullName
    })
    RETURN a
  `
  const params = {
    id,
    content,
    workflowId,
    createdAt,
    planId: planId || null,
    issueNumber: issueNumber || null,
    repoFullName: repoFullName || null,
  }
  const result = await tx.run<{ a: any }>(cypher, params)
  const raw = result.records[0]?.get("a")?.properties
  return alignmentAnalysisSchema.parse(raw)
}

// Optionally add relationships to Issue, Plan, WorkflowRun as needed
export async function linkAlignmentAnalysisNode(
  tx: ManagedTransaction,
  { alignmentId, planId, issueNumber, repoFullName, workflowId } : {
    alignmentId: string;
    planId?: string;
    issueNumber?: Integer;
    repoFullName?: string;
    workflowId?: string;
  }
): Promise<void> {
  // Link to Plan
  if(planId) {
    await tx.run(
      `MATCH (a:AlignmentAnalysis {id: $alignmentId}), (p:Plan {id: $planId})
       MERGE (a)-[:ANALYZES]->(p)
      `,
      { alignmentId, planId }
    )
  }
  // Link to Issue
  if(issueNumber && repoFullName) {
    await tx.run(
      `MATCH (a:AlignmentAnalysis {id: $alignmentId}), (i:Issue {number: $issueNumber, repoFullName: $repoFullName})
       MERGE (a)-[:ALIGNS]->(i)
      `,
      { alignmentId, issueNumber, repoFullName }
    )
  }
  // Link to WorkflowRun
  if(workflowId) {
    await tx.run(
      `MATCH (a:AlignmentAnalysis {id: $alignmentId}), (w:WorkflowRun {id: $workflowId})
       MERGE (a)-[:FROM_WORKFLOW]->(w)
      `,
      { alignmentId, workflowId }
    )
  }
}
