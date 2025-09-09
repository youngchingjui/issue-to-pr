// We use child_process exec for simple docker CLI commands that are not yet
// wrapped by util functions (start/stop). Keeping the dependency small avoids
// introducing additional dockerode calls for these one-liners.
import { exec as hostExec } from "child_process"
import { NextRequest, NextResponse } from "next/server"
import util from "util"

import {
  getContainerPreviewInfo,
  getContainerStatus,
  isContainerRunning,
  stopAndRemoveContainer,
} from "@/lib/docker"
import { containerNameForTrace } from "@/lib/utils/utils-common"

const execPromise = util.promisify(hostExec)

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  const containerName = containerNameForTrace(params.workflowId)
  const info = await getContainerPreviewInfo(containerName)
  return NextResponse.json(info)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  const { action } = (await request.json()) as { action?: string }

  if (!action || !["start", "stop", "delete"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const containerName = containerNameForTrace(params.workflowId)

  try {
    switch (action) {
      case "start": {
        // If container exists but not running, start it. Otherwise ignore.
        const running = await isContainerRunning(containerName)
        if (!running) {
          await execPromise(`docker start ${containerName}`)
        }
        break
      }
      case "stop": {
        // Stop without removing to allow future restarts
        await execPromise(`docker stop ${containerName}`)
        break
      }
      case "delete": {
        // Stop & remove via existing helper
        await stopAndRemoveContainer(containerName)
        break
      }
    }
  } catch (err) {
    console.error(
      `[ContainerActions] Failed to ${action} ${containerName}:`,
      err
    )
    return NextResponse.json(
      { error: "Failed to execute action" },
      { status: 500 }
    )
  }

  const status = await getContainerStatus(containerName)
  return NextResponse.json({ status })
}

