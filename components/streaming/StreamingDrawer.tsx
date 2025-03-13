"use client"

import * as React from "react"

import { Drawer } from "@/components/ui/drawer"
import { type Message, MessageStream } from "@/components/ui/message-stream"

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
}

export function StreamingDrawer({
  isOpen,
  onClose,
  title = "Streaming Output",
  onMount,
}: StreamingDrawerProps) {
  const [messages, setMessages] = React.useState<Message[]>([])
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
      clearMessages: () => setMessages([]),
    }),
    []
  )

  React.useEffect(() => {
    onMount?.(controls)
  }, [onMount, controls])

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={title}>
      <MessageStream messages={messages} isLoading={isLoading} />
    </Drawer>
  )
}
