"use server"

import AgentWorkflowClient from "@/components/agent-workflow/AgentWorkflowClient"

export default async function AgentWorkflowPage() {
  return (
    <div className="container mx-auto space-y-8 py-8">
      <AgentWorkflowClient />
    </div>
  )
}
