import { NextResponse } from "next/server"

import { WorkflowEmitter, WorkflowStage } from "@/lib/services/WorkflowEmitter"

export const dynamic = "force-dynamic"
export const runtime = "edge"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function POST() {
  const workflowId = crypto.randomUUID()
  console.log("Creating new workflow:", workflowId)

  // Define test workflow stages
  const stages: WorkflowStage[] = [
    {
      id: "initialization",
      name: "Initialization",
      description: "Setting up the workflow",
    },
    {
      id: "processing",
      name: "Processing",
      description: "Processing data",
    },
    {
      id: "validation",
      name: "Validation",
      description: "Validating results",
    },
    {
      id: "completion",
      name: "Completion",
      description: "Finalizing workflow",
    },
  ]

  // Initialize workflow
  console.log("Initializing workflow with stages:", workflowId)
  await WorkflowEmitter.initWorkflow(workflowId, stages)

  // Start async workflow processing
  console.log("Starting async workflow processing:", workflowId)
  processWorkflow(workflowId).catch((error) => {
    console.error("Error processing workflow:", workflowId, error)
  })

  return NextResponse.json({ workflowId })
}

async function processWorkflow(workflowId: string) {
  try {
    console.log("Starting workflow processing:", workflowId)

    // Stage 1: Initialization
    console.log("Starting initialization stage:", workflowId)
    await WorkflowEmitter.startStage(workflowId, "initialization")
    for (let i = 0; i <= 100; i += 20) {
      console.log("Updating initialization progress:", workflowId, i)
      await WorkflowEmitter.updateStageProgress(workflowId, "initialization", i)
      await sleep(500)
    }
    console.log("Completing initialization stage:", workflowId)
    await WorkflowEmitter.completeStage(workflowId, "initialization")

    // Stage 2: Processing
    console.log("Starting processing stage:", workflowId)
    await WorkflowEmitter.startStage(workflowId, "processing")
    for (let i = 0; i <= 100; i += 10) {
      console.log("Updating processing progress:", workflowId, i)
      await WorkflowEmitter.updateStageProgress(workflowId, "processing", i)
      await sleep(300)
    }
    console.log("Completing processing stage:", workflowId)
    await WorkflowEmitter.completeStage(workflowId, "processing")

    // Stage 3: Validation
    console.log("Starting validation stage:", workflowId)
    await WorkflowEmitter.startStage(workflowId, "validation")
    for (let i = 0; i <= 100; i += 25) {
      console.log("Updating validation progress:", workflowId, i)
      await WorkflowEmitter.updateStageProgress(workflowId, "validation", i)
      await sleep(400)
    }
    console.log("Completing validation stage:", workflowId)
    await WorkflowEmitter.completeStage(workflowId, "validation")

    // Stage 4: Completion
    console.log("Starting completion stage:", workflowId)
    await WorkflowEmitter.startStage(workflowId, "completion")
    for (let i = 0; i <= 100; i += 50) {
      console.log("Updating completion progress:", workflowId, i)
      await WorkflowEmitter.updateStageProgress(workflowId, "completion", i)
      await sleep(200)
    }
    console.log("Completing completion stage:", workflowId)
    await WorkflowEmitter.completeStage(workflowId, "completion")

    console.log("Workflow processing completed successfully:", workflowId)
  } catch (error) {
    console.error("Error in workflow processing:", workflowId, error)
    throw error
  }
}
