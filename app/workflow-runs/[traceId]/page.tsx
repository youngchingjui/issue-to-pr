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
      <main className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">
          {trace.name || "Workflow Run"}
        </h1>
        <WorkflowRunDetail trace={trace} />
      </main>
    )
  } catch (error) {
    console.error("Error fetching workflow run:", error)
    notFound()
  }
}
