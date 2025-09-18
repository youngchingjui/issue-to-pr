import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"

import { nextAuthReader } from "@/lib/adapters/auth/AuthReader"
import { getRepoFromString } from "@/lib/github/content"
import { getIssue } from "@/lib/github/issues"
import { neo4jDs } from "@/lib/neo4j"
import * as userRepo from "@/lib/neo4j/repositories/user"
import { ResolveRequestSchema } from "@/lib/schemas/api"
import autoResolveIssue from "@/lib/workflows/autoResolveIssue"
import { EventBusAdapter } from "@/shared/src/adapters/ioredis/EventBusAdapter"
import { makeSettingsReaderAdapter } from "@/shared/src/adapters/neo4j/repositories/SettingsReaderAdapter"

export async function POST(request: NextRequest) {
  try {
    // =================================================
    // Step 1: Parse inputs
    // =================================================
    const body = await request.json()
    const { issueNumber, repoFullName } = ResolveRequestSchema.parse(body)
    const { branch } = body as { branch?: string }

    const jobId = uuidv4()

    const redisUrl = process.env.REDIS_URL

    // =================================================
    // Step 2: Prepare adapters
    // =================================================

    const settingsAdapter = makeSettingsReaderAdapter({
      getSession: () => neo4jDs.getSession(),
      userRepo: userRepo,
    })

    const authAdapter = nextAuthReader

    const eventBus = redisUrl ? new EventBusAdapter(redisUrl) : undefined
    // =================================================
    // Step 3: Launch the background job
    // =================================================

    ;(async () => {
      try {
        const repo = await getRepoFromString(repoFullName)
        const issueResult = await getIssue({
          fullName: repoFullName,
          issueNumber,
        })

        if (issueResult.type !== "success") {
          throw new Error(JSON.stringify(issueResult))
        }

        await autoResolveIssue(
          {
            issue: issueResult.issue,
            repository: repo,
            jobId,
            branch,
          },
          {
            auth: authAdapter,
            settings: settingsAdapter,
            eventBus: eventBus,
          }
        )
      } catch (error) {
        console.error(error)
      }
    })()

    // =================================================
    // Step 4: Return the job ID
    // =================================================

    return NextResponse.json({ jobId })
  } catch (error) {
    console.error("Error processing request:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
