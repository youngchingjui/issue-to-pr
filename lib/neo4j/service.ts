import { Integer, Node } from "neo4j-driver"

import { Neo4jClient } from "@/lib/neo4j/client"
import { WorkflowRun, WorkflowRunStatus } from "@/lib/types/neo4j"

export class n4jService {
  private static instance: n4jService
  private client: Neo4jClient

  private constructor() {
    this.client = Neo4jClient.getInstance()
  }

  public static getInstance(): n4jService {
    if (!n4jService.instance) {
      n4jService.instance = new n4jService()
    }
    return n4jService.instance
  }

  public async listWorkflowRuns({
    issue,
  }: { issue?: { repoFullName: string; issueNumber: number } } = {}): Promise<
    (WorkflowRun & { status: WorkflowRunStatus })[]
  > {
    const session = await this.client.getSession()
    try {
      const result = await session.run<{
        w: Node<Integer, WorkflowRun>
        lastStatus: string | null
      }>(
        `
        MATCH (w:WorkflowRun)
        ${issue ? `MATCH (w)-[:BASED_ON_ISSUE]->(i:Issue {number: $issue.issueNumber, repoFullName: $issue.repoFullName})` : ""}
        OPTIONAL MATCH (status:Message {type: 'status'})-[:PART_OF]->(w)
        OPTIONAL MATCH (error:Message {type: 'error'})-[:PART_OF]->(w)
        WITH w, collect(status) as statusNodes, collect(error) as errorNodes
        
        // Determine the final status based on priority
        WITH w,
             [node in statusNodes WHERE apoc.convert.fromJsonMap(node.data).status = 'completed'][0] as completedStatus,
             [node in statusNodes WHERE apoc.convert.fromJsonMap(node.data).status = 'running'][0] as runningStatus,
             size(errorNodes) > 0 as hasError
        
        WITH w, 
             CASE
               WHEN completedStatus IS NOT NULL 
                 THEN 'completed'
               WHEN hasError 
                 THEN 'error'
               WHEN runningStatus IS NOT NULL 
                 THEN 'running'
               ELSE null
             END as lastStatus
        
        RETURN w, lastStatus
        ORDER BY w.created_at DESC
        `,
        { issue: issue ?? null }
      )
      const workflows = result.records.map((record) => record.get("w"))
      const lastStatus = result.records.map((record) =>
        record.get("lastStatus")
      )

      return workflows.map((workflow, index) => ({
        ...workflow.properties,
        status: lastStatus[index] as
          | "running"
          | "completed"
          | "error"
          | undefined,
      }))
    } finally {
      await session.close()
    }
  }
}

// Export a singleton instance
export const n4j = n4jService.getInstance()
