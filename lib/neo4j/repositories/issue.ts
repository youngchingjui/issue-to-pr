import { ManagedTransaction } from "neo4j-driver"

import { Issue as AppIssue } from "@/lib/types"
import { Issue as DbIssue, issueSchema } from "@/lib/types/db/neo4j"

export async function get(
  tx: ManagedTransaction,
  issue: DbIssue
): Promise<DbIssue> {
  const result = await tx.run(
    `MATCH (i:Issue {number: $number, repoFullName: $repoFullName}) RETURN i LIMIT 1`,
    { number: issue.number, repoFullName: issue.repoFullName }
  )
  return issueSchema.parse(result.records[0].get("i").properties)
}

export async function create(
  tx: ManagedTransaction,
  issue: DbIssue
): Promise<DbIssue> {
  const result = await tx.run(
    `CREATE (i:Issue {number: $number, repoFullName: $repo, createdAt: datetime()}) RETURN i`,
    { number: issue.number, repo: issue.repoFullName }
  )
  return issueSchema.parse(result.records[0].get("i").properties)
}

export async function getOrCreate(
  tx: ManagedTransaction,
  issue: DbIssue
): Promise<DbIssue> {
  const result = await tx.run(
    `MERGE (i:Issue {number: $number, repoFullName: $repo})
     ON CREATE SET i.createdAt = datetime()
     RETURN i`,
    { number: issue.number, repo: issue.repoFullName }
  )
  return issueSchema.parse(result.records[0].get("i").properties)
}

export const toAppIssue = (dbIssue: DbIssue): AppIssue => {
  return {
    ...dbIssue,
    number: dbIssue.number.toNumber(),
    createdAt: dbIssue.createdAt?.toStandardDate(),
    updatedAt: dbIssue.updatedAt?.toStandardDate(),
  }
}
