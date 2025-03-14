import * as React from "react"

import { cn } from "@/lib/utils/utils-common"

export interface WorkflowStage {
  id: string
  title: string
  description?: string
  status: "pending" | "in-progress" | "complete" | "error"
  startTime?: Date
  endTime?: Date
  progress?: number // Optional progress percentage within a stage
}

interface WorkflowProgressProps {
  stages: WorkflowStage[]
  className?: string
}

export function WorkflowProgress({ stages, className }: WorkflowProgressProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {stages.map((stage, index) => (
        <div
          key={stage.id}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg transition-colors",
            stage.status === "pending" && "bg-muted/50",
            stage.status === "in-progress" && "bg-primary/10",
            stage.status === "complete" && "bg-success/10",
            stage.status === "error" && "bg-destructive/10"
          )}
        >
          {/* Status indicator */}
          <div
            className={cn(
              "h-6 w-6 rounded-full flex items-center justify-center text-white",
              stage.status === "pending" && "bg-muted",
              stage.status === "in-progress" && "bg-primary",
              stage.status === "complete" && "bg-success",
              stage.status === "error" && "bg-destructive"
            )}
          >
            {stage.status === "complete" && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {stage.status === "error" && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
            {stage.status === "in-progress" && (
              <div className="h-3 w-3 rounded-full border-2 border-r-transparent animate-spin" />
            )}
          </div>

          {/* Stage info */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{stage.title}</h3>
              {stage.startTime && (
                <span className="text-xs text-muted-foreground">
                  {stage.startTime.toLocaleTimeString()}
                </span>
              )}
            </div>
            {stage.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {stage.description}
              </p>
            )}
            {stage.progress !== undefined && stage.status === "in-progress" && (
              <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-in-out"
                  style={{ width: `${stage.progress}%` }}
                />
              </div>
            )}
          </div>

          {/* Connector line to next stage */}
          {index < stages.length - 1 && (
            <div className="absolute left-5 h-full border-l border-muted-foreground/20" />
          )}
        </div>
      ))}
    </div>
  )
}
