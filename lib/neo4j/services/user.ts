"use server"

import { getGithubUser } from "@/lib/github/users"
import { n4j } from "@/lib/neo4j/client"
import * as userRepo from "@/lib/neo4j/repositories/user"
import { Settings as AppSettings } from "@/lib/types"
import { UserSettings as DbUserSettings } from "@/lib/types/db/neo4j"
import { neo4jDateTimeToDate } from "@/lib/neo4j/type-helpers"

export const toAppUserSettings = (db: DbUserSettings): AppSettings => {
  return {
    ...db,
    lastUpdated: neo4jDateTimeToDate(db.lastUpdated),
  }
}

export async function getUserSettings(): Promise<AppSettings | null> {
  const user = await getGithubUser()
  if (!user) return null
  const session = await n4j.getSession()
  try {
    const db = await session.executeRead((tx) =>
      userRepo.getUserSettings(tx, user.login)
    )
    return db ? toAppUserSettings(db) : null
  } finally {
    await session.close()
  }
}

export async function setUserOpenAIApiKey(apiKey: string): Promise<void> {
  const user = await getGithubUser()
  if (!user) throw new Error("User not authenticated")

  const session = await n4j.getSession()
  try {
    await session.executeWrite((tx) =>
      userRepo.setUserSettings(tx, user.login, {
        type: "user",
        openAIApiKey: apiKey,
      })
    )
  } finally {
    await session.close()
  }
}

export async function getUserOpenAIApiKey(): Promise<string | null> {
  const settings = await getUserSettings()
  if (!settings) return null
  const key = settings.openAIApiKey?.trim()
  return key ? key : null
}

/**
 * Add a role/tag to a user by username.
 * Throws if user does not exist.
 * Returns updated roles array.
 */
export async function addRoleToUser(
  username: string,
  role: string
): Promise<string[]> {
  if (!username || !role) throw new Error("Username and role are required")
  const session = await n4j.getSession()
  try {
    // Check user existence
    const exists = await session.executeRead((tx) =>
      userRepo.getUserSettings(tx, username)
    )
    if (!exists) throw new Error("User not found")
    // Add role
    const roles = await session.executeWrite((tx) =>
      userRepo.addRoleToUser(tx, username, role)
    )
    return roles
  } finally {
    await session.close()
  }
}

/**
 * Remove a role/tag from a user by username.
 * Throws if user does not exist.
 * Returns updated roles array.
 */
export async function removeRoleFromUser(
  username: string,
  role: string
): Promise<string[]> {
  if (!username || !role) throw new Error("Username and role are required")
  const session = await n4j.getSession()
  try {
    // Check user existence
    const exists = await session.executeRead((tx) =>
      userRepo.getUserSettings(tx, username)
    )
    if (!exists) throw new Error("User not found")
    // Remove role
    const roles = await session.executeWrite((tx) =>
      userRepo.removeRoleFromUser(tx, username, role)
    )
    return roles
  } finally {
    await session.close()
  }
}

/**
 * Fetch a user's roles/tags array by username.
 * Throws if user does not exist.
 * Returns the roles array (empty if none).
 */
export async function getUserRoles(username: string): Promise<string[]> {
  if (!username) throw new Error("Username is required")
  const session = await n4j.getSession()
  try {
    // Check user existence
    const exists = await session.executeRead((tx) =>
      userRepo.getUserSettings(tx, username)
    )
    if (!exists) throw new Error("User not found")
    // Get roles
    const roles = await session.executeRead((tx) =>
      userRepo.getUserRoles(tx, username)
    )
    return roles
  } finally {
    await session.close()
  }
}

