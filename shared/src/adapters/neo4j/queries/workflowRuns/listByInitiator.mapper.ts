import type { Record as Neo4jRecord } from "neo4j-driver"
import type { WorkflowRun } from "@shared/ports/db"

export function mapListByInitiator(records: Neo4jRecord[]): WorkflowRun[] {
  return records.map((r) => {
    const wr = r.get("wr") as any
    const repoFullName = r.get("repoFullName") as string | undefined
    return {
      id: wr.id as string,
      type: wr.type as string,
      createdAt: new Date(String(wr.createdAt)),
      postToGithub: Boolean(wr.postToGithub),
      state: (wr.state as WorkflowRun["state"]) ?? "pending",
      actor: { kind: "user" },
      repository: repoFullName ? { fullName: repoFullName } : undefined,
    }
  })
}

