"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

import { PostToGitHubButton } from "@/components/issues/actions/PostToGitHubButton";
import { Button } from "@/components/ui/button";
import { CollapsibleContent } from "@/components/ui/collapsible-content";
import { EventTime } from "@/components/workflow-runs/events";
import { CopyMarkdownButton } from "@/components/workflow-runs/events/CopyMarkdownButton";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Issue, LLMResponse, LLMResponseWithPlan } from "@/lib/types";

// Some LLM response event nodes will also be a Plan node
export interface Props {
  event: LLMResponse | LLMResponseWithPlan;
  issue?: Issue;
}

export function LLMResponseEvent({ event, issue }: Props) {
  // Feedback popover state
  const [feedback, setFeedback] = useState("");
  const [showThankYou, setShowThankYou] = useState(false);
  const [open, setOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowThankYou(true);
    setFeedback("");
    // auto-close after 2s
    setTimeout(() => {
      setShowThankYou(false);
      setOpen(false);
    }, 1600);
  }

  function handleCancel() {
    setFeedback("");
    setOpen(false);
    setShowThankYou(false);
  }

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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">Feedback</Button>
          </PopoverTrigger>
          <PopoverContent align="end">
            {showThankYou ? (
              <div className="text-center text-green-600 font-medium py-6">Thank you for your feedback!</div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-64">
                <label htmlFor="feedback-text" className="text-xs font-semibold text-muted-foreground">Feedback on this response:</label>
                <textarea
                  className="border rounded-md p-2 text-sm focus:outline-none focus:ring focus:border-primary bg-background resize-none"
                  id="feedback-text"
                  rows={3}
                  maxLength={500}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What did you like or dislike about this response?"
                  required
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2 mt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={!feedback.trim()}>
                    Submit
                  </Button>
                </div>
              </form>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  return (
    <CollapsibleContent
      headerContent={headerContent}
      className="hover:bg-muted/50"
    >
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{event.content}</ReactMarkdown>
      </div>
    </CollapsibleContent>
  );
}
