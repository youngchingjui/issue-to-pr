"use server"

import { ExternalLink } from "lucide-react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"

import { PostToGitHubButton } from "@/components/issues/actions/PostToGitHubButton"
import { Button } from "@/components/ui/button"
import { CollapsibleContent } from "@/components/ui/collapsible-content"
import { EventTime } from "@/components/workflow-runs/events"
import { CopyMarkdownButton } from "@/components/workflow-runs/events/CopyMarkdownButton"
import { LLMResponse, Plan } from "@/lib/types/neo4j"

// Some LLM response event nodes will also be a Plan node
export interface Props {
  event: LLMResponse & Partial<Plan> & { labels: string[] }
  issue?: { number: number; repoFullName: string }
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
        {issue && event.labels.includes("Plan") && (
          <>
            <Link
              href={`/${issue.repoFullName}/issues/${issue.number}/plan/${event.id}`}
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
