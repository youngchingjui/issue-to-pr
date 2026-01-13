"use client"

import ReactMarkdown from "react-markdown"

import { CollapsibleContent } from "@/components/ui/collapsible-content"
import { EventTime } from "@/components/workflow-runs/events/EventTime"
import { SystemPrompt } from "@/lib/types"

export interface Props {
  event: SystemPrompt
}

export function SystemPromptEvent({ event }: Props) {
  const headerContent = (
    <>
      <div className="text-xs font-medium text-blue-500 dark:text-blue-400">
        System Prompt
      </div>
      <EventTime timestamp={event.createdAt} />
    </>
  )

  return (
    <CollapsibleContent
      headerContent={headerContent}
      className={`border-l-2 border-blue-500 dark:border-blue-400 hover:bg-muted/50`}
    >
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{event.content}</ReactMarkdown>
      </div>
    </CollapsibleContent>
  )
}
