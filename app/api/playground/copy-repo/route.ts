import { NextRequest, NextResponse } from "next/server"
import { setupLocalRepository } from "@/lib/utils/utils-server"
import { createContainerizedWorkspace } from "@/lib/utils/container"

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

    // Docker cp the repo into the running container
    const mountPath = "/workspace"
    const { exec } = await createContainerizedWorkspace({
      repoFullName,
      hostRepoPath,
      mountPath,
      image: undefined,
      workflowId: containerName.replace(/^agent-/, "") // try to line up, fallback is fine
    })
    // Note: This may start a new container if the named one doesn't exist,
    // but ideally we'd just copy to the existing container - for safety we try using docker cp directly:
    const { default: util } = await import("util")
    const { exec: execHost } = await import("child_process")
    const execHostPromise = util.promisify(execHost)
    // Copy contents into the target container
    await execHostPromise(
      `docker cp "${hostRepoPath}/." ${containerName}:${mountPath}`
    )
    // Fix permissions if needed
    await exec(`chown -R root:root ${mountPath}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: typeof err === "string" ? err : (err instanceof Error ? err.message : "Unknown error") },
      { status: 500 }
    )
  }
}

