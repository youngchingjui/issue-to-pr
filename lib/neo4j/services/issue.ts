import { withTiming } from "@shared/utils/telemetry"
import { int, ManagedTransaction } from "neo4j-driver"

import { n4j } from "@/lib/neo4j/client"
import { neo4jToJs } from "@/lib/neo4j/convert"
import { get as dbGetIssue, setRequirements as dbSetRequirements } from "@/lib/neo4j/repositories/issue"
import { issueSchema } from "@/lib/types"
import type { Issue as DbIssue } from "@/lib/types/db/neo4j"

export async function upsertIssueRequirements({
  repoFullName,
  issueNumber,
  requirements,
}: {
  repoFullName: string
  issueNumber: number
  requirements: string
}): Promise<void> {
  const session = await n4j.getSession()
  try {
    await withTiming(
      `Neo4j WRITE: upsertIssueRequirements ${repoFullName}#${issueNumber}`,
      async () =>
        session.executeWrite(async (tx: ManagedTransaction) => {
          const dbIssue: DbIssue = {
            repoFullName,
            number: int(issueNumber),
          } as unknown as DbIssue
          await dbSetRequirements(tx, dbIssue, requirements)
        })
    )
  } finally {
    await session.close()
  }
}

export async function getIssueRequirements({
  repoFullName,
  issueNumber,
}: {
  repoFullName: string
  issueNumber: number
}): Promise<string | null> {
  const session = await n4j.getSession()
  try {
    const issue = await withTiming(
      `Neo4j READ: getIssueRequirements ${repoFullName}#${issueNumber}`,
      async () =>
        session.executeRead(async (tx: ManagedTransaction) => {
          const dbIssue: DbIssue = {
            repoFullName,
            number: int(issueNumber),
          } as unknown as DbIssue
          const node = await dbGetIssue(tx, dbIssue)
          return node
        })
    )

    const parsed = issueSchema.parse(neo4jToJs(issue))
    return parsed.requirements ?? null
  } catch {
    // If not found or any error, return null gracefully
    return null
  } finally {
    await session.close()
  }
}

