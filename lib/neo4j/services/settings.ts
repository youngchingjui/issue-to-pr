"use server"

import { n4j } from "@/lib/neo4j/client"
import * as settingsRepo from "@/lib/neo4j/repositories/settings"

export async function setSharedOpenAIApiKey(apiKey: string): Promise<void> {
  const session = await n4j.getSession()
  try {
    await session.executeWrite((tx) =>
      settingsRepo.setSharedOpenAIApiKey(tx, apiKey)
    )
  } finally {
    await session.close()
  }
}

export async function getSharedOpenAIApiKey(): Promise<string | null> {
  const session = await n4j.getSession()
  try {
    const key = await session.executeRead((tx) =>
      settingsRepo.getSharedOpenAIApiKey(tx)
    )
    return key
  } finally {
    await session.close()
  }
}

