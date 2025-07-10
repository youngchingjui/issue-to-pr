import { Integer, ManagedTransaction, Node } from "neo4j-driver"

import { Task, taskSchema } from "@/lib/types/db/neo4j"

export async function create(
  tx: ManagedTransaction,
  task: Omit<Task, "createdAt" | "githubIssueNumber"> & {
    githubIssueNumber?: Integer
  }
): Promise<Task> {
  const result = await tx.run<{ t: Node<Integer, Task, "Task"> }>(
    `CREATE (t:Task {id: $id, repoFullName: $repoFullName, createdBy: $createdBy, createdAt: datetime(),
      title: $title, body: $body, syncedToGithub: $syncedToGithub, githubIssueNumber: $githubIssueNumber}) RETURN t`,
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
    `MATCH (t:Task {id: $id}) RETURN t LIMIT 1`,
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
    `MATCH (t:Task {repoFullName: $repoFullName}) RETURN t ORDER BY t.createdAt DESC`,
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
    `MATCH (t:Task {id: $id}) SET t += $props RETURN t`,
    { id, props }
  )
  return taskSchema.parse(result.records[0].get("t").properties)
}

export async function remove(
  tx: ManagedTransaction,
  id: string
): Promise<void> {
  await tx.run(`MATCH (t:Task {id: $id}) DETACH DELETE t`, { id })
}

export const toAppTask = (db: Task): import("@/lib/types").Task => {
  return {
    ...db,
    createdAt: db.createdAt.toStandardDate(),
    githubIssueNumber: db.githubIssueNumber?.toNumber(),
  }
}
