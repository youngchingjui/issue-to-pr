"use server"

import AgentWorkflowClient from "@/components/agent-workflow/AgentWorkflowClient"

export default async function AgentWorkflowPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4">
      <AgentWorkflowClient />
    </div>
  )
}
