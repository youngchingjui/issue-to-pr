import { NextResponse } from "next/server"
import type { Session } from "neo4j-driver"

import { auth } from "@/auth"
import { n4j } from "@/lib/neo4j/client"
import * as userRepo from "@/lib/neo4j/repositories/user"
import {
  makeSettingsReaderAdapter,
  type Neo4jSessionLike,
} from "shared/adapters/neo4j/repositories/SettingsReaderAdapter"

export async function GET() {
  const session = await auth()
  const login = session?.profile?.login
  if (!login) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Bridge our local Neo4j client to the shared adapter interface
  const adapter = makeSettingsReaderAdapter({
    getSession: (): Neo4jSessionLike => {
      // Lazy session creation per adapter call
      let inner: Session | null = null
      return {
        executeRead: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
          if (!inner) inner = await n4j.getSession()
          return inner.executeRead(fn)
        },
        close: async () => {
          if (inner) {
            await inner.close()
            inner = null
          }
        },
      }
    },
    userRepo: {
      getUserSettings: (tx: unknown, username: string) =>
        userRepo.getUserSettings(tx as never, username),
    },
  })

  const result = await adapter.getOpenAIKey(login)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    hasOpenAIKey: Boolean(result.value && result.value.trim().length > 0),
  })
}

