"use server"

import { isContainerRunning } from "@/lib/docker"
import { createApplyPatchTool } from "@/lib/tools/ApplyPatchTool"

export async function runApplyPatch({
  containerName,
  workdir,
  filePath,
  patch,
}: {
  containerName: string
  workdir: string
  filePath: string
  patch: string
}): Promise<{ status: string; message: string }> {
  if (!containerName || !(await isContainerRunning(containerName))) {
    return {
      status: "error",
      message: `Container not running: ${containerName}`,
    }
  }

  const tool = createApplyPatchTool(workdir)
  return await tool.handler({ filePath, patch })
}
