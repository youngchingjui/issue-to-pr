"use client"

import * as React from "react"

import { cn } from "@/lib/utils/utils-common"

import { ScrollArea } from "./scroll-area"

export interface Message {
  id: string
  type: "system" | "llm" | "error"
  content: string
  timestamp: Date
}

interface MessageStreamProps {
  messages: Message[]
  isLoading?: boolean
  className?: string
}

export function MessageStream({
  messages,
  isLoading = false,
  className,
}: MessageStreamProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Auto scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  return (
    <ScrollArea className={cn("h-full w-full", className)}>
      <div className="flex flex-col gap-4 p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "rounded-lg p-4",
              message.type === "system" && "bg-muted",
              message.type === "llm" && "bg-primary/10",
              message.type === "error" && "bg-destructive/10"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  "text-xs font-medium",
                  message.type === "system" && "text-muted-foreground",
                  message.type === "llm" && "text-primary",
                  message.type === "error" && "text-destructive"
                )}
              >
                {message.type.toUpperCase()}
              </span>
              <span className="text-xs text-muted-foreground">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        )}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  )
}
