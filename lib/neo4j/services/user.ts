"use server"

import { getGithubUser } from "@/lib/github/users"
import { n4j } from "@/lib/neo4j/client"
import { neo4jToJs } from "@/lib/neo4j/convert"
import * as userRepo from "@/lib/neo4j/repositories/user"
import { Settings, settingsSchema } from "@/lib/types"
import type { LLMProvider } from "@/shared/lib/types"

export async function getUserSettings(): Promise<Settings | null> {
  const user = await getGithubUser()
  if (!user) return null
  const session = await n4j.getSession()
  try {
    const db = await session.executeRead((tx) =>
      userRepo.getUserSettings(tx, user.login)
    )
    return db ? settingsSchema.parse(neo4jToJs(db)) : null
  } finally {
    await session.close()
  }
}

export async function setUserOpenAIApiKey(apiKey: string): Promise<void> {
  const user = await getGithubUser()
  if (!user) throw new Error("User not authenticated")

  // If no default provider is set, make this the default
  const currentProvider = await getUserLLMProvider()
  const needsDefault = !currentProvider

  const session = await n4j.getSession()
  try {
    await session.executeWrite((tx) =>
      userRepo.setUserSettings(tx, user.login, {
        type: "user",
        openAIApiKey: apiKey,
        ...(needsDefault && { llmProvider: "openai" as const }),
      })
    )
  } finally {
    await session.close()
  }
}

export async function setUserAnthropicApiKey(apiKey: string): Promise<void> {
  const user = await getGithubUser()
  if (!user) throw new Error("User not authenticated")

  // If no default provider is set, make this the default
  const currentProvider = await getUserLLMProvider()
  const needsDefault = !currentProvider

  const session = await n4j.getSession()
  try {
    await session.executeWrite((tx) =>
      userRepo.setUserSettings(tx, user.login, {
        type: "user",
        anthropicApiKey: apiKey,
        ...(needsDefault && { llmProvider: "anthropic" as const }),
      })
    )
  } finally {
    await session.close()
  }
}

export async function setUserLLMProvider(provider: LLMProvider): Promise<void> {
  const user = await getGithubUser()
  if (!user) throw new Error("User not authenticated")

  const session = await n4j.getSession()
  try {
    await session.executeWrite((tx) =>
      userRepo.setUserSettings(tx, user.login, {
        type: "user",
        llmProvider: provider,
      })
    )
  } finally {
    await session.close()
  }
}

/**
 * @deprecated Use `getOpenAIKey` in shared/adapters/neo4j/repositories/SettingsReaderAdapter.ts instead
 */
export async function getUserOpenAIApiKey(): Promise<string | null> {
  const settings = await getUserSettings()
  if (!settings) return null

  // 1) Prefer the user's own key if set
  const userKey = settings.openAIApiKey?.trim()
  if (userKey) return userKey

  // 2) If user has demo access, fall back to the demo key from env
  const hasDemoAccess = settings.roles?.includes("demo")
  const demoKey = process.env.OPENAI_DEMO_API_KEY?.trim()
  if (hasDemoAccess && demoKey) return demoKey

  // 3) Otherwise, no key available
  return null
}

export async function getUserAnthropicApiKey(): Promise<string | null> {
  const settings = await getUserSettings()
  if (!settings) return null

  const userKey = settings.anthropicApiKey?.trim()
  if (userKey) return userKey

  return null
}

export async function getUserLLMProvider(): Promise<LLMProvider | null> {
  const settings = await getUserSettings()
  return settings?.llmProvider ?? null
}

/**
 * Resolve the user's API key based on their provider preference.
 * See docs/user/multi-model-support.md "Defaults and fallbacks".
 *
 * Priority: explicit provider preference → single available key → error.
 * No implicit provider preference — if multiple keys exist with no default set,
 * the user must choose explicitly.
 */
export async function resolveUserApiKey(): Promise<
  | { ok: true; apiKey: string; provider: LLMProvider }
  | { ok: false; error: string }
> {
  const settings = await getUserSettings()
  if (!settings) {
    return {
      ok: false,
      error:
        "No API key configured. Please add an API key for at least one provider in Settings.",
    }
  }

  const explicitProvider = settings.llmProvider ?? null

  const getKey = (provider: LLMProvider): string | null => {
    if (provider === "openai") {
      const key = settings.openAIApiKey?.trim()
      if (key) return key
      const hasDemoAccess = settings.roles?.includes("demo")
      const demoKey = process.env.OPENAI_DEMO_API_KEY?.trim()
      if (hasDemoAccess && demoKey) return demoKey
      return null
    }
    if (provider === "anthropic") {
      const key = settings.anthropicApiKey?.trim()
      if (key) return key
      const hasDemoAccess = settings.roles?.includes("demo")
      const demoKey = process.env.ANTHROPIC_API_KEY?.trim()
      if (hasDemoAccess && demoKey) return demoKey
      return null
    }
    return null
  }

  // Explicit provider preference — check that provider's key
  if (explicitProvider) {
    const key = getKey(explicitProvider)
    if (!key) {
      const providerName =
        explicitProvider === "openai" ? "OpenAI" : "Anthropic"
      return {
        ok: false,
        error: `Your ${providerName} API key is missing. Please add it in Settings.`,
      }
    }
    return { ok: true, apiKey: key, provider: explicitProvider }
  }

  // No explicit preference — check what keys are available
  const hasOpenAI = !!getKey("openai")
  const hasAnthropic = !!getKey("anthropic")

  if (hasOpenAI && hasAnthropic) {
    return {
      ok: false,
      error:
        "You have API keys for multiple providers but no default selected. Please choose a default provider in Settings.",
    }
  }

  if (hasOpenAI)
    return { ok: true, apiKey: getKey("openai")!, provider: "openai" }
  if (hasAnthropic)
    return { ok: true, apiKey: getKey("anthropic")!, provider: "anthropic" }

  return {
    ok: false,
    error:
      "No API key configured. Please add an API key for at least one provider in Settings.",
  }
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
