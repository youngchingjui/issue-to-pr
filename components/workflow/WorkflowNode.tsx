import { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type NodeType = "llm" | "tool_call" | "tool_response" | "error"

interface WorkflowNodeProps {
  type: NodeType
  content: string
  isStreaming?: boolean
  children?: ReactNode
}

export default function WorkflowNode({
  type,
  content,
  isStreaming = false,
  children,
}: WorkflowNodeProps) {
  return (
    <div className="relative">
      <div
        className={cn(
          "p-4 rounded-lg border mb-2 max-w-3xl",
          type === "llm" && "bg-blue-50 border-blue-200",
          type === "tool_call" && "bg-purple-50 border-purple-200",
          type === "tool_response" && "bg-green-50 border-green-200",
          type === "error" && "bg-red-50 border-red-200"
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              type === "llm" && "bg-blue-500",
              type === "tool_call" && "bg-purple-500",
              type === "tool_response" && "bg-green-500",
              type === "error" && "bg-red-500"
            )}
          />
          <span className="text-sm font-medium text-gray-500">
            {type === "llm" && "AI Response"}
            {type === "tool_call" && "Tool Call"}
            {type === "tool_response" && "Tool Response"}
            {type === "error" && "Error"}
          </span>
          {isStreaming && (
            <span className="text-sm text-gray-500">(streaming...)</span>
          )}
        </div>
        <div className="prose prose-sm max-w-none">{content}</div>
      </div>
      {children && (
        <div className="pl-8 border-l-2 border-gray-200 ml-4">{children}</div>
      )}
    </div>
  )
}
