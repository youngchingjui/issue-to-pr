"use server"

import { Integer } from "neo4j-driver"
import { v4 as uuidv4 } from "uuid"

import { n4j } from "@/lib/neo4j/client"
import { neo4jToJs } from "@/lib/neo4j/convert"
import * as repo from "@/lib/neo4j/repositories/task"
import { Task as AppTask } from "@/lib/types"
import { RepoFullName } from "@/lib/types/github"

type CreateTaskParams = {
  id?: string
  repoFullName: RepoFullName
  title?: string
  body?: string
  createdBy: string
}

export async function createTask({
  id = uuidv4(),
  repoFullName,
  title,
  body,
  createdBy,
}: CreateTaskParams): Promise<AppTask> {
  const session = await n4j.getSession()
  try {
    const db = await session.executeWrite((tx) =>
      repo.create(tx, {
        id,
        repoFullName: repoFullName.fullName,
        title,
        body,
        createdBy,
        syncedToGithub: false,
      })
    )
    return neo4jToJs(db)
  } finally {
    await session.close()
  }
}

export async function getTask(id: string): Promise<AppTask | null> {
  const session = await n4j.getSession()
  try {
    const db = await session.executeRead((tx) => repo.get(tx, id))
    return db ? neo4jToJs(db) : null
  } finally {
    await session.close()
  }
}

export async function listTasksForRepo(
  repoFullName: string
): Promise<AppTask[]> {
  const session = await n4j.getSession()
  try {
    const db = await session.executeRead((tx) =>
      repo.listForRepo(tx, repoFullName)
    )
    return db.map(neo4jToJs)
  } finally {
    await session.close()
  }
}

export async function updateTask({
  id,
  username,
  title,
  body,
  syncedToGithub,
  githubIssueNumber,
}: {
  id: string
  username: string
  title?: string | null
  body?: string | null
  syncedToGithub?: boolean
  githubIssueNumber?: number | null
}): Promise<AppTask> {
  const session = await n4j.getSession()
  try {
    const existing = await session.executeRead((tx) => repo.get(tx, id))
    if (!existing) throw new Error("Task not found")
    if (existing.createdBy !== username)
      throw new Error("Not authorized to edit task")
    const db = await session.executeWrite((tx) =>
      repo.update(tx, id, {
        title,
        body,
        syncedToGithub,
        githubIssueNumber:
          githubIssueNumber !== undefined && githubIssueNumber !== null
            ? new Integer(githubIssueNumber)
            : null,
      })
    )
    return neo4jToJs(db)
  } finally {
    await session.close()
  }
}

export async function deleteTask(id: string, username: string): Promise<void> {
  const session = await n4j.getSession()
  try {
    const existing = await session.executeRead((tx) => repo.get(tx, id))
    if (!existing) return
    if (existing.createdBy !== username)
      throw new Error("Not authorized to delete task")
    await session.executeWrite((tx) => repo.remove(tx, id))
  } finally {
    await session.close()
  }
}
