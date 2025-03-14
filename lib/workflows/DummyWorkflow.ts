import { WorkflowEmitter, WorkflowStage } from "@/lib/services/WorkflowEmitter"

interface DummyWorkflowConfig {
  progressUpdates?: boolean
  stageDelays?: {
    initialization: number
    processing: number
    validation: number
    completion: number
  }
  errorStage?: string
}

const DEFAULT_DELAY = 200

export async function runDummyWorkflow(config: DummyWorkflowConfig = {}) {
  const {
    progressUpdates = true,
    stageDelays = {
      initialization: DEFAULT_DELAY,
      processing: DEFAULT_DELAY,
      validation: DEFAULT_DELAY,
      completion: DEFAULT_DELAY,
    },
    errorStage,
  } = config

  const stages: WorkflowStage[] = [
    {
      id: "initialization",
      name: "Initialization",
      description: "Setting up the workflow environment",
    },
    {
      id: "processing",
      name: "Processing",
      description: "Processing data and performing main operations",
    },
    {
      id: "validation",
      name: "Validation",
      description: "Validating results and checking for errors",
    },
    {
      id: "completion",
      name: "Completion",
      description: "Finalizing and cleaning up",
    },
  ]

  const workflowId = crypto.randomUUID()
  await WorkflowEmitter.initWorkflow(workflowId, stages)

  // Process stages
  for (const stage of stages) {
    await WorkflowEmitter.startStage(workflowId, stage.id)

    if (progressUpdates) {
      for (let progress = 0; progress <= 100; progress += 20) {
        await WorkflowEmitter.updateStageProgress(
          workflowId,
          stage.id,
          progress
        )
        await new Promise((resolve) =>
          setTimeout(resolve, stageDelays[stage.id as keyof typeof stageDelays])
        )
      }
    }

    if (errorStage === stage.id) {
      await WorkflowEmitter.completeStage(
        workflowId,
        stage.id,
        "Simulated error in stage"
      )
      break
    }

    await WorkflowEmitter.completeStage(workflowId, stage.id)
  }

  return workflowId
}

// Example usage:
// const config = {
//   stageDelays: {
//     initialization: 1000,
//     processing: 3000,
//     validation: 2000,
//     completion: 1000,
//   },
//   errorStage: "validation", // Optional: make a stage fail
//   progressUpdates: true, // Optional: show progress updates
// }
// const workflowId = await runDummyWorkflow(config)
