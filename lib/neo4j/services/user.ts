"use server"

import { getGithubUser } from "@/lib/github/users"
import { n4j } from "@/lib/neo4j/client"
import * as userRepo from "@/lib/neo4j/repositories/user"
import { Settings as AppSettings } from "@/lib/types"
import { UserSettings as DbUserSettings } from "@/lib/types/db/neo4j"

export const toAppUserSettings = (db: DbUserSettings): AppSettings => {
  return {
    ...db,
    lastUpdated: db.lastUpdated.toStandardDate(),
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
