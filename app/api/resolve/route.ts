import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"

import { getRepoFromString } from "@/lib/github/content"
import { getIssue } from "@/lib/github/issues"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import { resolveIssue } from "@/lib/workflows/resolveIssue"

import {
  type ResolveErrorResponse,
  ResolveRequestSchema,
  type ResolveResponse,
} from "./schemas"

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
      const errorResponse: ResolveErrorResponse = {
        error: "Missing OpenAI API key",
      }
      return NextResponse.json(errorResponse, { status: 401 })
    }

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
          ...(environment && { environment }),
          ...(installCommand && { installCommand }),
        })
      } catch (error) {
        console.error(String(error))
      }
    })()

    const response: ResolveResponse = { jobId }
    return NextResponse.json(response)
  } catch (error) {
    console.error("Error processing request:", error)

    if (error instanceof z.ZodError) {
      const errorResponse: ResolveErrorResponse = {
        error: "Invalid request data",
        details: error.errors,
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const errorResponse: ResolveErrorResponse = {
      error: "Failed to process request",
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
