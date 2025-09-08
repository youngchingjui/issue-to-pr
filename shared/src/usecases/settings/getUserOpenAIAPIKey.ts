import type { User } from "@shared/entities/User"

import { SettingsReaderPort } from "@/shared/src/ports/repositories/settings.reader"

export async function getUserOpenAIAPIKey(
  ports: SettingsReaderPort,
  user: User
) {
  const result = await ports.getOpenAIKey(user.id)
  if (!result.ok) {
    throw new Error("Unable to read user settings")
  }
  const openaiApiKey = result.value
  if (!openaiApiKey) {
    throw new Error(
      "OpenAI API key not found. Please configure it in settings."
    )
  }
  return openaiApiKey
}
