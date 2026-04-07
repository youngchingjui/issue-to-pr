"use client"

import { Bot, Code2 } from "lucide-react"

import { CollapsibleContent } from "@/components/ui/collapsible-content"
import { EventTime } from "@/components/workflow-runs/events/EventTime"
import { ToolCall } from "@/lib/types"

export interface Props {
  event: ToolCall
}

function parseAgentArgs(argsStr: string): {
  subagentType?: string
  prompt?: string
} {
  try {
    const parsed = JSON.parse(argsStr)
    return {
      subagentType: parsed.subagent_type ?? parsed.subagentType,
      prompt: parsed.prompt ?? parsed.description,
    }
  } catch {
    return {}
  }
}

export function ToolCallEvent({ event }: Props) {
  const isSubAgent = event.toolName === "Agent"
  const args = event.args ? JSON.parse(event.args) : {}

  if (isSubAgent) {
    const { subagentType, prompt } = parseAgentArgs(event.args ?? "{}")
    const label = subagentType
      ? `Sub-Agent / ${subagentType}`
      : "Sub-Agent"

    const headerContent = (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-purple-500" />
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-medium text-purple-500">{label}</span>
          </div>
        </div>
        <EventTime timestamp={event.createdAt} />
      </div>
    )

    return (
      <CollapsibleContent
        headerContent={headerContent}
        className="border-l-2 border-purple-500 dark:border-purple-400 hover:bg-muted/50"
      >
        {prompt && (
          <div className="text-sm whitespace-pre-wrap">{prompt}</div>
        )}
      </CollapsibleContent>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-3 sm:p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Code2 className="h-3.5 w-3.5 text-blue-500" />
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-medium text-blue-500">Tool Call</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{event.toolName}</span>
          </div>
        </div>
        <EventTime timestamp={event.createdAt} />
      </div>

      {Object.entries(args).length > 0 && (
        <div className="mt-2 space-y-1.5">
          {Object.entries(args).map(([key, value]) => (
            <div key={key} className="text-sm">
              <span className="font-medium text-muted-foreground">{key}:</span>{" "}
              <span className="font-mono">
                {typeof value === "string" ? value : JSON.stringify(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
