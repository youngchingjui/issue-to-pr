import { NextRequest, NextResponse } from "next/server"

import { copyRepoToExistingContainer } from "@/lib/utils/container"
import { setupLocalRepository } from "@/lib/utils/utils-server"

export async function POST(req: NextRequest) {
  try {
    const { repoFullName, containerName } = await req.json()
    if (!repoFullName || !containerName) {
      return NextResponse.json(
        { error: "Missing repoFullName or containerName" },
        { status: 400 }
      )
    }

    // Make sure local repo exists and get its path
    let hostRepoPath: string
    try {
      hostRepoPath = await setupLocalRepository({ repoFullName })
    } catch (err) {
      return NextResponse.json(
        { error: `Failed to prepare local repo: ${err}` },
        { status: 400 }
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
      return NextResponse.json(
        { error: `Failed to copy repo to container: ${err}` },
        { status: 400 }
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
