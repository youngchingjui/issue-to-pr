import { useEffect, useState } from "react"

import { toast } from "@/hooks/use-toast"
import { WorkflowEvent } from "@/lib/types/events"

import WorkflowNode, { NodeType } from "./WorkflowNode"

interface Message {
  id: string
  type: NodeType
  content: string
  parentId?: string
  isStreaming?: boolean
  children?: Message[]
}

interface WorkflowStreamProps {
  workflowId: string
  onComplete?: () => void
  onError?: () => void
}

export default function WorkflowStream({
  workflowId,
  onComplete,
  onError,
}: WorkflowStreamProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log("WorkflowStream useEffect", workflowId)
    const eventSource = new EventSource(`/api/workflow/${workflowId}`)
    console.log("EventSource", eventSource)
    let currentLLMMessage: Message | null = null

    const handleEvent = (event: MessageEvent) => {
      const workflowEvent: WorkflowEvent = JSON.parse(event.data)

      switch (workflowEvent.type) {
        case "llm_response": {
          if (!currentLLMMessage) {
            // Create new LLM message
            currentLLMMessage = {
              id: Date.now().toString(),
              type: "llm",
              content: workflowEvent.data.content,
              isStreaming: true,
            }
            setMessages((prev) => [...prev, currentLLMMessage!])
          } else {
            // Update existing LLM message
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === currentLLMMessage.id
                  ? {
                      ...msg,
                      content: msg.content + workflowEvent.data.content,
                    }
                  : msg
              )
            )
          }
          break
        }

        case "tool_call": {
          // Mark current LLM message as complete
          if (currentLLMMessage) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === currentLLMMessage.id
                  ? { ...msg, isStreaming: false }
                  : msg
              )
            )
          }

          // Add tool call message
          const toolCall = workflowEvent.data.toolCalls[0]
          const newMessage: Message = {
            id: Date.now().toString(),
            type: "tool_call",
            content: `${toolCall.function.name}(${toolCall.function.arguments})`,
            parentId: currentLLMMessage?.id,
          }
          setMessages((prev) => [...prev, newMessage])
          break
        }

        case "tool_response": {
          setMessages((prev) => {
            const newMessage: Message = {
              id: Date.now().toString(),
              type: "tool_response",
              content: workflowEvent.data.response,
              parentId: prev[prev.length - 1]?.id,
            }
            return [...prev, newMessage]
          })
          break
        }

        case "error": {
          const error = workflowEvent.data as Error
          setError(error.message)
          setMessages((prev) => {
            const newMessage: Message = {
              id: Date.now().toString(),
              type: "error",
              content: error.message,
              parentId: prev[prev.length - 1]?.id,
            }
            return [...prev, newMessage]
          })
          eventSource.close()
          onError?.()
          toast({
            title: "Resolution Plan Generation Failed",
            description: error.message,
            variant: "destructive",
          })
          break
        }

        case "complete": {
          // Mark current LLM message as complete
          if (currentLLMMessage) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === currentLLMMessage!.id
                  ? { ...msg, isStreaming: false }
                  : msg
              )
            )
            currentLLMMessage = null
          }
          eventSource.close()
          onComplete?.()
          toast({
            title: "Resolution Plan Generated",
            description: "The plan has been posted as a comment on the issue.",
          })
          break
        }
      }
    }

    eventSource.onmessage = handleEvent
    eventSource.onerror = (error) => {
      console.error("EventSource error:", error)
      setError("Connection error")
      eventSource.close()
      onError?.()
      toast({
        title: "Connection Error",
        description: "Lost connection to the server. Please try again.",
        variant: "destructive",
      })
    }

    return () => {
      eventSource.close()
    }
  }, [workflowId, onComplete, onError])

  // Convert flat message list to tree structure
  const messageTree = messages.reduce((acc: Message[], message) => {
    if (!message.parentId) {
      return [...acc, message]
    }

    const addChildToParent = (messages: Message[]): Message[] => {
      return messages.map((msg) => {
        if (msg.id === message.parentId) {
          return {
            ...msg,
            children: [...(msg.children || []), message],
          }
        }
        if (msg.children) {
          return {
            ...msg,
            children: addChildToParent(msg.children),
          }
        }
        return msg
      })
    }

    return addChildToParent(acc)
  }, [])

  // Recursive function to render message tree
  const renderMessageTree = (messages: Message[]) => {
    return messages.map((message) => (
      <WorkflowNode
        key={message.id}
        type={message.type}
        content={message.content}
        isStreaming={message.isStreaming}
      >
        {message.children && renderMessageTree(message.children)}
      </WorkflowNode>
    ))
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }

  return <div className="space-y-4 py-4">{renderMessageTree(messageTree)}</div>
}
