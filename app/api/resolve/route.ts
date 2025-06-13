import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"

import { getRepoFromString } from "@/lib/github/content"
import { getIssue } from "@/lib/github/issues"
import { ResolveRequestSchema } from "@/lib/schemas/api"
import { resolveIssue } from "@/lib/workflows/resolveIssue"
import { auth } from "@/auth"
import { getUserOpenAIApiKey } from "@/lib/neo4j/repositories/user"
import { decrypt } from "@/lib/utils/encryption"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
    }

    const body = await request.json()
    const { issueNumber, repoFullName, createPR } =
      ResolveRequestSchema.parse(body)

    // Get API key from database
    const encryptedKey = await getUserOpenAIApiKey(session.user.id)
    if (!encryptedKey) {
      return NextResponse.json(
        {
          error:
            "Missing OpenAI API key. Please add your API key in the settings page.",
        },
        { status: 400 }
      )
    }
    let apiKey: string
    try {
      apiKey = decrypt(encryptedKey)
    } catch {
      return NextResponse.json(
        { error: "Failed to decrypt or recognize your API key. Please reset it." },
        { status: 400 }
      )
    }

    // Generate a unique job ID
    const jobId = uuidv4()

    // Start the resolve workflow as a background job
    ;(async () => {
      try {
        // Get full repository details and issue
        const fullRepo = await getRepoFromString(repoFullName)
        const issue = await getIssue({
          fullName: repoFullName,
          issueNumber,
        })

        await resolveIssue({
          issue,
          repository: fullRepo,
          apiKey,
          jobId,
          createPR,
        })
      } catch (error) {
        // Save error status
        console.error(String(error))
      }
    })()

    // Return the job ID immediately
    return NextResponse.json({ jobId })
  } catch (error) {
    console.error("Error processing request:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
