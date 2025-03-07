"use client"

import { useMemo } from "react"

import type { ToolCall } from "@/lib/types/langfuse"

interface ToolCallViewProps {
  toolCall: ToolCall
}

export default function ToolCallView({ toolCall }: ToolCallViewProps) {
  const prettyArgs = useMemo(() => {
    try {
      const args = JSON.parse(toolCall.function.arguments || "{}")
      return JSON.stringify(args, null, 2)
    } catch (e) {
      return toolCall.function.arguments || ""
    }
  }, [toolCall.function.arguments])

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium mb-1">Function</div>
        <div className="text-sm font-mono bg-slate-100 p-2 rounded">
          {toolCall.function.name}
        </div>
      </div>

      <div>
        <div className="text-sm font-medium mb-1">Arguments</div>
        <pre className="text-sm font-mono bg-slate-100 p-2 rounded overflow-auto max-h-64">
          {prettyArgs}
        </pre>
      </div>
    </div>
  )
}
