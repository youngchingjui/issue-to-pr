import { NextRequest, NextResponse } from "next/server"
import { App } from "octokit"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"

import { getPrivateKeyFromFile } from "@/lib/github"
import { getRepoFromString } from "@/lib/github/content"
import { getIssue } from "@/lib/github/issues"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import { ResolveRequestSchema } from "@/lib/schemas/api"
import { runWithInstallationId } from "@/lib/utils/utils-server"
import { resolveIssue } from "@/lib/workflows/resolveIssue"

async function getRepoInstallationId(
  repoFullName: string
): Promise<number | null> {
  try {
    const [owner, repo] = repoFullName.split("/")
    if (!owner || !repo) return null

    const appId = process.env.GITHUB_APP_ID
    if (!appId) return null

    const privateKey = await getPrivateKeyFromFile()
    const app = new App({ appId, privateKey })
    const installation = await app.getInstallationUrl({ owner, repo })
    return installation.id
  } catch (err) {
    console.warn(
      `[WARNING] Unable to resolve installation id for ${repoFullName}:`,
      err
    )
    return null
  }
}

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

    const jobId = uuidv4()

    ;(async () => {
      try {
        const installationId = await getRepoInstallationId(repoFullName)

        const executeWorkflow = async () => {
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
        }

        if (installationId) {
          runWithInstallationId(String(installationId), executeWorkflow)
        } else {
          await executeWorkflow()
        }
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
