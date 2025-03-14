import { redis } from "@/lib/redis"

const WORKFLOW_KEY_PREFIX = "workflow:"

export interface LLMOutput {
  content: string
  timestamp: Date
}

export interface WorkflowStageMetadata {
  llm_output?: LLMOutput
  [key: string]: unknown
}

export interface WorkflowStage {
  id: string
  name: string
  description?: string
  startedAt?: Date
  completedAt?: Date
  progress?: number
  error?: string
  metadata?: WorkflowStageMetadata
}

export interface WorkflowState {
  workflowId: string
  stages: WorkflowStage[]
  currentStageId?: string
  startedAt?: Date
  completedAt?: Date
  error?: string
}

export class WorkflowEmitter {
  private static getWorkflowKey(workflowId: string): string {
    return `${WORKFLOW_KEY_PREFIX}${workflowId}`
  }

  static async initWorkflow(
    workflowId: string,
    stages: WorkflowStage[]
  ): Promise<void> {
    console.log("Initializing workflow in Redis:", workflowId)
    const initialState: WorkflowState = {
      workflowId,
      stages,
      startedAt: new Date(),
    }
    await redis.set(this.getWorkflowKey(workflowId), initialState)
  }

  static async getWorkflowState(
    workflowId: string
  ): Promise<WorkflowState | null> {
    console.log("Getting workflow state from Redis:", workflowId)
    const state = await redis.get<WorkflowState>(
      this.getWorkflowKey(workflowId)
    )
    if (!state) {
      console.log("No state found for workflow:", workflowId)
      return null
    }

    // Convert date strings back to Date objects
    return {
      ...state,
      startedAt: state.startedAt ? new Date(state.startedAt) : undefined,
      completedAt: state.completedAt ? new Date(state.completedAt) : undefined,
      stages: state.stages.map((stage) => ({
        ...stage,
        startedAt: stage.startedAt ? new Date(stage.startedAt) : undefined,
        completedAt: stage.completedAt
          ? new Date(stage.completedAt)
          : undefined,
      })),
    }
  }

  static async setStageMetadata(
    workflowId: string,
    stageId: string,
    metadata: Partial<WorkflowStage>
  ): Promise<void> {
    console.log("Setting stage metadata:", workflowId, stageId, metadata)
    const state = await this.getWorkflowState(workflowId)
    if (!state) return

    const stageIndex = state.stages.findIndex((s) => s.id === stageId)
    if (stageIndex === -1) return

    state.stages[stageIndex] = {
      ...state.stages[stageIndex],
      ...metadata,
    }

    await redis.set(this.getWorkflowKey(workflowId), state)
  }

  static async startStage(workflowId: string, stageId: string): Promise<void> {
    console.log("Starting stage:", workflowId, stageId)
    const state = await this.getWorkflowState(workflowId)
    if (!state) return

    const stageIndex = state.stages.findIndex((s) => s.id === stageId)
    if (stageIndex === -1) return

    state.currentStageId = stageId
    state.stages[stageIndex].startedAt = new Date()

    await redis.set(this.getWorkflowKey(workflowId), state)
  }

  static async completeStage(
    workflowId: string,
    stageId: string,
    error?: string
  ): Promise<void> {
    console.log("Completing stage:", workflowId, stageId, error)
    const state = await this.getWorkflowState(workflowId)
    if (!state) return

    const stageIndex = state.stages.findIndex((s) => s.id === stageId)
    if (stageIndex === -1) return

    state.stages[stageIndex].completedAt = new Date()
    if (error) {
      state.stages[stageIndex].error = error
      state.error = error
      state.completedAt = new Date()
    } else if (stageIndex === state.stages.length - 1) {
      state.completedAt = new Date()
    }

    await redis.set(this.getWorkflowKey(workflowId), state)
  }

  static async updateStageProgress(
    workflowId: string,
    stageId: string,
    progress: number
  ): Promise<void> {
    console.log("Updating stage progress:", workflowId, stageId, progress)
    const state = await this.getWorkflowState(workflowId)
    if (!state) return

    const stageIndex = state.stages.findIndex((s) => s.id === stageId)
    if (stageIndex === -1) return

    state.stages[stageIndex].progress = progress

    await redis.set(this.getWorkflowKey(workflowId), state)
  }
}
