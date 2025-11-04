import { int, Integer, ManagedTransaction, Node } from "neo4j-driver"
import { z } from "zod"

import { pullRequestSchema } from "@/lib/types/db/neo4j"

export type PullRequestNode = z.infer<typeof pullRequestSchema>

export async function upsertPullRequest(
  tx: ManagedTransaction,
  {
    repoFullName,
    number,
    url,
    title,
  }: {
    repoFullName: string
    number: number
    url: string
    title?: string | null
  }
): Promise<PullRequestNode> {
  const result = await tx.run<{ pr: Node<Integer, PullRequestNode, "PullRequest"> }>(
    `
    MERGE (pr:PullRequest { repoFullName: $repoFullName, number: $number })
    ON CREATE SET pr.createdAt = datetime(), pr.url = $url, pr.title = $title
    ON MATCH SET
      pr.url = coalesce(pr.url, $url),
      pr.title = coalesce(pr.title, $title)
    RETURN pr
    `,
    { repoFullName, number: int(number), url, title: title ?? null }
  )
  const raw = result.records[0]?.get("pr")?.properties
  return pullRequestSchema.parse(raw)
}

export async function linkEventCreatedPR(
  tx: ManagedTransaction,
  {
    eventId,
    repoFullName,
    number,
  }: {
    eventId: string
    repoFullName: string
    number: number
  }
): Promise<void> {
  await tx.run(
    `
    MATCH (e:Event:Message {id: $eventId})
    MATCH (pr:PullRequest { repoFullName: $repoFullName, number: $number })
    MERGE (e)-[:CREATED_PR]->(pr)
    `,
    { eventId, repoFullName, number: int(number) }
  )
}

