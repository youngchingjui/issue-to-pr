"use client"

import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

import { WorkflowStage, WorkflowState } from "@/lib/services/WorkflowEmitter"

interface WorkflowStagesProps {
  workflowId: string
}

// Helper function to determine stage status
function getStageStatus(
  stage: WorkflowStage
): "completed" | "in_progress" | "pending" | "failed" {
  if (stage.error) return "failed"
  if (stage.completedAt) return "completed"
  if (stage.startedAt) return "in_progress"
  return "pending"
}

export default function WorkflowStages({ workflowId }: WorkflowStagesProps) {
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const eventSource = new EventSource(`/api/workflow/${workflowId}`)

    eventSource.onmessage = (event) => {
      if (event.data === "Stream finished") {
        eventSource.close()
        return
      }

      try {
        const state = JSON.parse(event.data)
        setWorkflowState(state)
      } catch (err) {
        console.error("Failed to parse workflow state:", err)
        setError("Failed to parse workflow state")
      }
    }

    eventSource.onerror = (error) => {
      console.error("Lost connection to workflow updates", error)
      setError("Lost connection to workflow updates")
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [workflowId])

  if (error) {
    return (
      <div className="text-red-500 p-4 rounded-md bg-red-50">
        Error: {error}
      </div>
    )
  }

  if (!workflowState) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Overall workflow progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Workflow Progress</h3>
          <span className="text-sm text-muted-foreground">
            {workflowState.completedAt ? "Completed" : "In Progress"}
          </span>
        </div>
      </div>

      {/* Stages */}
      <div className="space-y-4">
        {workflowState.stages.map((stage, index, array) => (
          <StageItem
            key={stage.id}
            stage={stage}
            isActive={workflowState.currentStageId === stage.id}
            isLast={index === array.length - 1}
          />
        ))}
      </div>

      {/* Error display */}
      {workflowState.error && (
        <div className="mt-4 p-4 rounded-md bg-red-50 text-red-500">
          {workflowState.error}
        </div>
      )}
    </div>
  )
}

interface StageItemProps {
  stage: WorkflowStage
  isActive: boolean
  isLast: boolean
}

function StageItem({ stage, isActive, isLast }: StageItemProps) {
  const status = getStageStatus(stage)

  return (
    <div className="relative">
      <div className="flex items-start">
        {/* Status indicator */}
        <div className="flex-shrink-0 h-6 w-6">
          {status === "completed" && (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          )}
          {status === "failed" && (
            <CheckCircle2 className="h-6 w-6 text-red-500" />
          )}
          {status === "in_progress" && (
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          )}
          {status === "pending" && (
            <Circle className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        {/* Stage content */}
        <div className="ml-4 min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900">{stage.name}</div>
          {stage.description && (
            <div className="mt-0.5 text-sm text-muted-foreground">
              {stage.description}
            </div>
          )}
          {typeof stage.progress === "number" && status === "in_progress" && (
            <div className="mt-2">
              <div className="overflow-hidden bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 bg-blue-500 transition-all duration-500"
                  style={{ width: `${stage.progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground mt-1">
                {stage.progress}%
              </span>
            </div>
          )}
          {stage.error && (
            <div className="mt-2 text-sm text-red-500">{stage.error}</div>
          )}
          {/* LLM Output */}
          {stage.metadata?.llm_output && (
            <div className="mt-2 p-2 bg-gray-50 rounded-md">
              <div className="text-xs text-muted-foreground mb-1">
                LLM Output (
                {new Date(
                  stage.metadata.llm_output.timestamp
                ).toLocaleTimeString()}
                )
              </div>
              <div className="text-sm whitespace-pre-wrap font-mono">
                {stage.metadata.llm_output.content}
              </div>
            </div>
          )}
        </div>

        {/* Timing information */}
        <div className="ml-4 flex-shrink-0">
          <div className="text-xs text-muted-foreground space-y-1">
            {stage.startedAt && (
              <div>
                Started: {new Date(stage.startedAt).toLocaleTimeString()}
              </div>
            )}
            {stage.completedAt && (
              <div>
                Completed: {new Date(stage.completedAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connector line */}
      {!isLast && (
        <div className="absolute top-6 left-3 -ml-px h-full w-0.5 bg-gray-200" />
      )}
    </div>
  )
}
