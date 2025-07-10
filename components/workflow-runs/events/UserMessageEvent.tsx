"use client"

import ReactMarkdown from "react-markdown"

import { CollapsibleContent } from "@/components/ui/collapsible-content"
import { EventTime } from "@/components/workflow-runs/events"
import { ReviewComment, UserMessage } from "@/lib/types"

export interface Props {
  event: UserMessage | ReviewComment
}

export async function UserMessageEvent({ event }: Props) {
  const headerContent = (
    <>
      <div className="text-xs font-medium text-muted-foreground">
        User Message
      </div>
      <EventTime timestamp={event.createdAt} />
    </>
  )

  return (
    <CollapsibleContent
      headerContent={headerContent}
      className="hover:bg-muted/50"
    >
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{event.content}</ReactMarkdown>
      </div>
    </CollapsibleContent>
  )
}
