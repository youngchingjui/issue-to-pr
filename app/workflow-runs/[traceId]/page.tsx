import { notFound } from "next/navigation"

import WorkflowRunDetail from "@/components/workflow-runs/WorkflowRunDetail"
import { langfuse } from "@/lib/langfuse"

export default async function WorkflowRunDetailPage({
  params,
}: {
  params: { traceId: string }
}) {
  const { traceId } = params

  try {
    const { data: trace } = await langfuse.fetchTrace(traceId)

    if (!trace) {
      notFound()
    }

    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">
          {trace.name || "Workflow Run"}
        </h1>
        <WorkflowRunDetail trace={trace} />
      </div>
    )
  } catch (error) {
    console.error("Error fetching workflow run:", error)
    throw error
  }
}
