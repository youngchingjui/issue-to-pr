"use server"

import fs from "fs/promises"
import path from "path"
import AgentWorkflowClient from "@/components/agent-workflow/AgentWorkflowClient"

export default async function AgentWorkflowPage() {
  const toolsDir = path.join(process.cwd(), "lib", "tools")
  const entries = await fs.readdir(toolsDir)
  const toolNames = entries
    .filter((f) => f.endsWith(".ts") && f !== "helper.ts")
    .map((f) => f.replace(/\.ts$/, ""))
  return (
    <div className="container mx-auto space-y-8 py-8">
      <AgentWorkflowClient tools={toolNames} />
    </div>
  )
}
