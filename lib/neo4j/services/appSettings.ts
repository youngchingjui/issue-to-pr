"use server"

import { getGithubUser } from "@/lib/github/users"
import { n4j } from "@/lib/neo4j/client"
import * as globalSettingsRepo from "@/lib/neo4j/repositories/globalSettings"
import { getUserRoles } from "@/lib/neo4j/services/user"

function assertAdminRoles(roles: string[]) {
  if (!roles.includes("admin")) {
    throw new Error("Admin role required")
  }
}

export async function getDemoOpenAIApiKey(): Promise<string | null> {
  const session = await n4j.getSession()
  try {
    const key = await session.executeRead((tx) =>
      globalSettingsRepo.getDemoOpenAIApiKey(tx)
    )
    return key
  } finally {
    await session.close()
  }
}

export async function setDemoOpenAIApiKey(key: string): Promise<void> {
  const user = await getGithubUser()
  if (!user) throw new Error("User not authenticated")
  const roles = await getUserRoles(user.login)
  assertAdminRoles(roles)

  const session = await n4j.getSession()
  try {
    await session.executeWrite((tx) =>
      globalSettingsRepo.setDemoOpenAIApiKey(tx, key)
    )
  } finally {
    await session.close()
  }
}

export async function deleteDemoOpenAIApiKey(): Promise<void> {
  const user = await getGithubUser()
  if (!user) throw new Error("User not authenticated")
  const roles = await getUserRoles(user.login)
  assertAdminRoles(roles)

  const session = await n4j.getSession()
  try {
    await session.executeWrite((tx) =>
      globalSettingsRepo.deleteDemoOpenAIApiKey(tx)
    )
  } finally {
    await session.close()
  }
}

