import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

import { auth } from "@/auth"
import { neo4jDs } from "@/lib/neo4j"
import * as userRepo from "@/lib/neo4j/repositories/user"
import {
  CreateDependentPRRequestSchema,
  CreateDependentPRResponseSchema,
} from "@/lib/types/api/schemas"
import { createDependentPRWorkflow } from "@/lib/workflows/createDependentPR"
import { makeSettingsReaderAdapter } from "@/shared/src/adapters/neo4j/repositories/SettingsReaderAdapter"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const parse = CreateDependentPRRequestSchema.safeParse(json)
    if (!parse.success) {
      return NextResponse.json(
        { error: "Invalid request body.", details: parse.error.errors },
        { status: 400 }
      )
    }

    const { repoFullName, pullNumber, jobId } = parse.data

    const session = await auth()
    const login = session?.profile?.login

    if (!login) {
      return NextResponse.json(
        {
          error:
            "Missing GitHub login. Please try again by signing out and then signing in again.",
        },
        { status: 401 }
      )
    }

    const settingsReader = makeSettingsReaderAdapter({
      getSession: () => neo4jDs.getSession(),
      userRepo: userRepo,
    })

    const apiKeyResult = await settingsReader.getOpenAIKey(login)
    if (!apiKeyResult.ok || !apiKeyResult.value) {
      return NextResponse.json(
        {
          error:
            "Missing OpenAI API key. Please set OPENAI_API_KEY in your settings.",
        },
        { status: 401 }
      )
    }
    const apiKey = apiKeyResult.value

    const effectiveJobId = jobId || uuidv4()

    ;(async () => {
      try {
        await createDependentPRWorkflow({
          repoFullName,
          pullNumber,
          apiKey,
          jobId: effectiveJobId,
        })
      } catch (e) {
        console.error("[create-dependent-pr] Background run failed:", e)
      }
    })()

    return NextResponse.json(
      CreateDependentPRResponseSchema.parse({
        success: true,
        result: { jobId: effectiveJobId },
      })
    )
  } catch (e) {
    console.error("[create-dependent-pr] Failed:", e)
    return NextResponse.json(
      { error: "Failed to create dependent PR." },
      { status: 500 }
    )
  }
}
