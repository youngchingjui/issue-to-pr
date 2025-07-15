// This script registers BullMQ workflow processors for all workflows
import { registerWorkflowProcessor } from "./workflow-queue"
import { workflowProcessors } from "@/lib/workflows"

// Adapter to call the correct function (based on "workflow" field)
const processor = async (job) => {
  const { workflow, params } = job.data
  const func = workflowProcessors[workflow]
  if (!func) throw new Error(`Unknown workflow: ${workflow}`)
  return func(params)
}

registerWorkflowProcessor(processor)

// Export for testing or for direct process launch
export { registerWorkflowProcessor }

