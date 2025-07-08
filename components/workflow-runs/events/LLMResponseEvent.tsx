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
import { toast } from "@/lib/hooks/use-toast"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import * as React from "react"

// Inline client/test button for firing resolveIssue UX with toasts only (no backend)
function ResolveIssueTestButton() {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (Math.random() < 0.5) {
                toast({
                  title: "Resolution Launch Succeeded (Test)",
                  description: "UI test: ResolveIssue button fired. No backend action was called.",
                })
              } else {
                toast({
                  title: "Failed to Launch Resolution (Test)",
                  description: "UI test: No backend action. This is an error toast for demonstration only.",
                  variant: "destructive",
                })
              }
            }}
            className="ml-2"
            aria-label="Launch resolveIssue (UI Test)"
          >
            Resolve Issue (UI Test)
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span>This button is for UI testing only; it does not launch any backend.</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

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
            <ResolveIssueTestButton />
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

