import fs from "fs/promises"
import path from "path"

import { getWorkflowRunMessages } from "@/lib/neo4j/services/workflow"

// Helper to find the next available messagesN.json filename
async function getDefaultFilename(dir = "test-utils/mocks") {
  let n = 1
  while (true) {
    const candidate = path.join(dir, `messages${n}.json`)
    try {
      await fs.access(candidate)
      n++
    } catch {
      return candidate
    }
  }
}

// Export messages for a workflowRunId to a file, return the output path
export async function exportMessages(
  workflowRunId: string,
  outputFile?: string
): Promise<string> {
  if (!workflowRunId) {
    throw new Error("workflowRunId is required")
  }

  // Fetch messages from DB
  const messages = await getWorkflowRunMessages(workflowRunId)

  // Determine output path
  let outPath: string
  if (outputFile) {
    outPath = path.isAbsolute(outputFile)
      ? outputFile
      : path.join(process.cwd(), outputFile)
  } else {
    outPath = await getDefaultFilename()
  }

  await fs.writeFile(outPath, JSON.stringify(messages, null, 2))
  return outPath
}
