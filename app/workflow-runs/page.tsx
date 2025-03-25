import { Suspense } from "react"

import TableSkeleton from "@/components/layout/TableSkeleton"
import WorkflowRunsList from "@/components/workflow-runs/WorkflowRunsList"
import { langfuse } from "@/lib/langfuse"
import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"

export default async function WorkflowRunsPage() {
  const [{ data: traces }, neoWorkflows] = await Promise.all([
    langfuse.fetchTraces(),
    WorkflowPersistenceService.getWorkflows(),
  ])

  // TODO: add pagination, using `meta` info
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Workflow Runs</h1>
      <Suspense fallback={<TableSkeleton />}>
        <WorkflowRunsList traces={traces} neoWorkflows={neoWorkflows} />
      </Suspense>
    </main>
  )
}
