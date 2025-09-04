"use server"

import { getGithubUser } from "@/lib/github/users"
import { getSharedOpenAIApiKey } from "@/lib/neo4j/services/settings"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import { getOpenAIKeyForUser } from "@shared/core/ports/api-keys"
import { allowAllSharedKeyPolicy, withPolicy } from "@shared/services/openai-keys"

/**
 * Returns the effective OpenAI API key for the current user, following the rule:
 * - user key > shared key (if allowed) > null
 */
export async function getEffectiveOpenAIApiKey(): Promise<string | null> {
  const user = await getGithubUser()
  if (!user) return null

  const deps = withPolicy(allowAllSharedKeyPolicy)({
    userReader: {
      async getUserOpenAIKey(_username: string) {
        // This service uses the current session and logged-in user
        return getUserOpenAIApiKey()
      },
    },
    sharedReader: {
      async getSharedOpenAIKey() {
        return getSharedOpenAIApiKey()
      },
    },
  })

  return getOpenAIKeyForUser({ username: user.login }, deps)
}

