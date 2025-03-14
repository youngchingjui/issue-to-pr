"use client"

import * as React from "react"

import { Drawer } from "@/components/ui/drawer"
import { type Message, MessageStream } from "@/components/ui/message-stream"
import {
  WorkflowProgress,
  type WorkflowStage,
} from "@/components/ui/workflow-progress"

interface StreamingDrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  onMount?: (controls: StreamingDrawerControls) => void
}

export interface StreamingDrawerControls {
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void
  setLoading: (isLoading: boolean) => void
  clearMessages: () => void
  updateStages: (stages: WorkflowStage[]) => void
  updateStageStatus: (stageId: string, updates: Partial<WorkflowStage>) => void
}

export function StreamingDrawer({
  isOpen,
  onClose,
  title = "Streaming Output",
  onMount,
}: StreamingDrawerProps) {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [stages, setStages] = React.useState<WorkflowStage[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  const controls: StreamingDrawerControls = React.useMemo(
    () => ({
      addMessage: (message: Omit<Message, "id" | "timestamp">) => {
        setMessages((prev) => [
          ...prev,
          {
            ...message,
            id: crypto.randomUUID(),
            timestamp: new Date(),
          },
        ])
      },
      setLoading: setIsLoading,
      clearMessages: () => {
        setMessages([])
        setStages([])
      },
      updateStages: (newStages: WorkflowStage[]) => {
        setStages(newStages)
      },
      updateStageStatus: (stageId: string, updates: Partial<WorkflowStage>) => {
        setStages((prevStages) =>
          prevStages.map((stage) =>
            stage.id === stageId ? { ...stage, ...updates } : stage
          )
        )
      },
    }),
    []
  )

  React.useEffect(() => {
    onMount?.(controls)
  }, [onMount, controls])

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col h-full">
        {stages.length > 0 && (
          <div className="p-4 border-b">
            <WorkflowProgress stages={stages} />
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <MessageStream messages={messages} isLoading={isLoading} />
        </div>
      </div>
    </Drawer>
  )
}
