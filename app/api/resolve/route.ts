import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"

import { auth } from "@/auth"
import { getRepoFromString } from "@/lib/github/content"
import { getIssue } from "@/lib/github/issues"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import { ResolveRequestSchema } from "@/lib/schemas/api"
import { resolveIssue } from "@/lib/workflows/resolveIssue"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      issueNumber,
      repoFullName,
      createPR,
      environment,
      installCommand,
      planId,
    } = ResolveRequestSchema.parse(body)

    const apiKey = await getUserOpenAIApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OpenAI API key" },
        { status: 401 }
      )
    }

    const session = await auth()
    const initiatorGithubLogin = session?.profile?.login

    const jobId = uuidv4()

    ;(async () => {
      try {
        const fullRepo = await getRepoFromString(repoFullName)
        const issue = await getIssue({ fullName: repoFullName, issueNumber })

        if (issue.type !== "success") {
          throw new Error(JSON.stringify(issue))
        }

        await resolveIssue({
          issue: issue.issue,
          repository: fullRepo,
          apiKey,
          jobId,
          createPR,
          planId,
          initiatorGithubLogin,
          ...(environment && { environment }),
          ...(installCommand && { installCommand }),
        })
      } catch (error) {
        console.error(String(error))
      }
    })()

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

