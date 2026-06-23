import { Integer, ManagedTransaction, Node } from "neo4j-driver"

import { Labels } from "@/lib/neo4j/labels"
import { Task, taskSchema } from "@/lib/types/db/neo4j"

/**
 * Create a new Task node and link it to the User that created it.
 *
 * 1. Ensure a `User` node exists (create if missing).
 * 2. Create the `Task` node.
 * 3. Create a `(:User)-[:CREATED_TASK]->(:Task)` relationship.
 *
 * NOTE: The relationship is additive – the `createdBy` property on the Task
 *       is still written for backwards-compatibility with any existing
 *       queries that rely on it.
 */
export async function create(
  tx: ManagedTransaction,
  task: Omit<Task, "createdAt" | "githubIssueNumber"> & {
    githubIssueNumber?: Integer
  }
): Promise<Task> {
  const result = await tx.run<{ t: Node<Integer, Task, "Task"> }>(
    `MERGE (u:${Labels.User} {username: $createdBy})
     CREATE (t:${Labels.Task} {
       id: $id,
       repoFullName: $repoFullName,
       createdBy: $createdBy,
       createdAt: datetime(),
       title: $title,
       body: $body,
       syncedToGithub: $syncedToGithub,
       githubIssueNumber: $githubIssueNumber
     })
     MERGE (u)-[:CREATED_TASK]->(t)
     RETURN t`,
    {
      id: task.id,
      repoFullName: task.repoFullName,
      createdBy: task.createdBy,
      title: task.title ?? null,
      body: task.body ?? null,
      syncedToGithub: task.syncedToGithub,
      githubIssueNumber: task.githubIssueNumber ?? null,
    }
  )
  return taskSchema.parse(result.records[0].get("t").properties)
}

export async function get(
  tx: ManagedTransaction,
  id: string
): Promise<Task | null> {
  const result = await tx.run<{ t: Node<Integer, Task, "Task"> }>(
    `MATCH (t:${Labels.Task} {id: $id}) RETURN t LIMIT 1`,
    { id }
  )
  const raw = result.records[0]?.get("t")?.properties
  return raw ? taskSchema.parse(raw) : null
}

export async function listForRepo(
  tx: ManagedTransaction,
  repoFullName: string
): Promise<Task[]> {
  const result = await tx.run<{ t: Node<Integer, Task, "Task"> }>(
    `MATCH (t:${Labels.Task} {repoFullName: $repoFullName}) RETURN t ORDER BY t.createdAt DESC`,
    { repoFullName }
  )
  return result.records.map((r) => taskSchema.parse(r.get("t").properties))
}

export async function update(
  tx: ManagedTransaction,
  id: string,
  updates: {
    title?: string | null
    body?: string | null
    syncedToGithub?: boolean
    githubIssueNumber?: Integer | null
  }
): Promise<Task> {
  const props: Record<string, unknown> = {}
  if ("title" in updates) props.title = updates.title
  if ("body" in updates) props.body = updates.body
  if ("syncedToGithub" in updates) props.syncedToGithub = updates.syncedToGithub
  if ("githubIssueNumber" in updates)
    props.githubIssueNumber = updates.githubIssueNumber
  const result = await tx.run<{ t: Node<Integer, Task, "Task"> }>(
    `MATCH (t:${Labels.Task} {id: $id}) SET t += $props RETURN t`,
    { id, props }
  )
  return taskSchema.parse(result.records[0].get("t").properties)
}

export async function remove(
  tx: ManagedTransaction,
  id: string
): Promise<void> {
  await tx.run(`MATCH (t:${Labels.Task} {id: $id}) DETACH DELETE t`, { id })
}

