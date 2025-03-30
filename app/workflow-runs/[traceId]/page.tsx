import { notFound } from "next/navigation"

import WorkflowRunDetail from "@/components/workflow-runs/WorkflowRunDetail"
import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"

export default async function WorkflowRunDetailPage({
  params,
}: {
  params: { traceId: string }
}) {
  const { traceId } = params

  const workflowEvents = await new WorkflowPersistenceService()
    .getWorkflowEvents(traceId)
    .catch(() => null)

  // If we found a workflow
  if (workflowEvents && workflowEvents.length > 0) {
    return (
      <main className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Workflow Run</h1>
        <WorkflowRunDetail events={workflowEvents} />
      </main>
    )
  }

  // If no workflow was found
  notFound()
}
