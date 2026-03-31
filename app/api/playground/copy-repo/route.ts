import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import { copyRepoToExistingContainer } from "@/lib/utils/container"
import { setupLocalRepository } from "@/shared/lib/utils/utils-server"

const requestSchema = z.object({
  repoFullName: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  containerName: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.-]*$/),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.token?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body: unknown = await req.json().catch(() => null)
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid repoFullName or containerName" },
        { status: 400 }
      )
    }

    const { repoFullName, containerName } = parsed.data

    // Make sure local repo exists and get its path
    let hostRepoPath: string
    try {
      hostRepoPath = await setupLocalRepository({ repoFullName })
    } catch (err) {
      console.error("[copy-repo] setupLocalRepository failed", err)
      return NextResponse.json(
        { error: "Failed to prepare local repository" },
        { status: 500 }
      )
    }

    // Copy the repo into the existing running container
    const mountPath = "/workspace"
    try {
      await copyRepoToExistingContainer({
        hostRepoPath,
        containerName,
        mountPath,
      })
    } catch (err) {
      console.error("[copy-repo] copyRepoToExistingContainer failed", err)
      return NextResponse.json(
        { error: "Failed to copy repository into container" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          typeof err === "string"
            ? err
            : err instanceof Error
              ? err.message
              : "Unknown error",
      },
      { status: 500 }
    )
  }
}

