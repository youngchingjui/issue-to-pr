"use server"

import { ExternalLink } from "lucide-react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"

import { FeedbackButton } from "@/components/common/FeedbackButton"
import { PostToGitHubButton } from "@/components/issues/actions/PostToGitHubButton"
import { Button } from "@/components/ui/button"
import { CollapsibleContent } from "@/components/ui/collapsible-content"
import { EventTime } from "@/components/workflow-runs/events"
import { CopyMarkdownButton } from "@/components/workflow-runs/events/CopyMarkdownButton"
import { Issue, LLMResponse, LLMResponseWithPlan } from "@/lib/types"

// Some LLM response event nodes will also be a Plan node
export interface Props {
  event: LLMResponse | LLMResponseWithPlan
  issue?: Issue
}

export async function LLMResponseEvent({ event, issue }: Props) {
  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          LLM Response
        </div>
        <EventTime timestamp={event.createdAt} />
      </div>
      <div className="flex items-center gap-2">
        {issue && event.type === "llmResponseWithPlan" && (
          <>
            <Link
              href={`/${issue.repoFullName}/issues/${issue.number}/plan/${event.plan.id}`}
            >
              <Button variant="ghost" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View Plan
              </Button>
            </Link>
            <PostToGitHubButton content={event.content} issue={issue} />
          </>
        )}
        <CopyMarkdownButton content={event.content} />
        <FeedbackButton />
      </div>
    </div>
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
