import WorkflowRunsList from "@/components/workflow-runs/WorkflowRunsList"
import { langfuse } from "@/lib/langfuse"

export default async function WorkflowRunsPage() {
  const { data: traces, meta } = await langfuse.fetchTraces()

  // TODO: add pagination, using `meta` info
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Workflow Runs</h1>
      <WorkflowRunsList traces={traces} />
    </div>
  )
}
