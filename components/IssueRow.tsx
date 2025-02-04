"use client"

import {
  AlertCircle,
  GitPullRequest,
  Loader2,
  MessageCircle,
} from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GitHubIssue, GitHubRepository } from "@/lib/types"
import { getApiKeyFromLocalStorage } from "@/lib/utils"

type Log = {
  message: string
  timestamp: string
}

interface IssueRowProps {
  issue: GitHubIssue
  repo: GitHubRepository
}

export function IssueRow({ issue, repo }: IssueRowProps) {
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null)
  const [logs, setLogs] = useState<Record<string, Log[]>>({})
  const [sseStatus, setSseStatus] = useState<
    Record<string, "connecting" | "open" | "closed">
  >({})

  const apiKey = getApiKeyFromLocalStorage()

  const handleAddComment = async (issueId: number) => {
    setExpandedIssue(expandedIssue === issueId ? null : issueId)
    if (!sseStatus[issueId]) {
      setSseStatus((prev) => ({ ...prev, [issueId]: "connecting" }))

      try {
        // Initiate POST request to start comment workflow
        const response = await fetch("/api/comment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            issueNumber: issue.number,
            repo,
            apiKey,
          }),
        })

        const { jobId } = await response.json()

        // Set up SSE to listen for updates
        const eventSource = new EventSource(`/api/comment?jobId=${jobId}`)

        eventSource.onmessage = (event) => {
          const status = event.data
          setLogs((prev) => ({
            ...prev,
            [issueId]: [
              ...(prev[issueId] || []),
              {
                message: `Status update: ${status}`,
                timestamp: new Date().toISOString(),
              },
            ],
          }))

          if (status.startsWith("Completed") || status.startsWith("Failed")) {
            setSseStatus((prev) => ({ ...prev, [issueId]: "closed" }))
            eventSource.close()
          } else {
            setSseStatus((prev) => ({ ...prev, [issueId]: "open" }))
          }
        }

        eventSource.onerror = (event) => {
          console.error("SSE connection failed:", event)
          setSseStatus((prev) => ({ ...prev, [issueId]: "closed" }))
        }
      } catch (error) {
        setLogs((prev) => ({
          ...prev,
          [issueId]: [
            ...(prev[issueId] || []),
            {
              message: `Error: ${error.message}`,
              timestamp: new Date().toISOString(),
            },
          ],
        }))
        console.error("Failed to start comment workflow:", error)
        setSseStatus((prev) => ({ ...prev, [issueId]: "closed" }))
      }
    }
  }

  return (
    <div className="flex flex-col border-b">
      <div className="flex py-2 px-4">
        <div className="flex-1">{issue.title}</div>
        <div className="flex-1">{issue.state}</div>
        <div className="flex-1">
          <Button onClick={() => handleAddComment(issue.id)} variant="outline">
            <MessageCircle className="mr-2 h-4 w-4" />
            Add GitHub Comment
          </Button>
        </div>
        <div className="flex-1">
          <Button variant="outline">
            <GitPullRequest className="mr-2 h-4 w-4" />
            Fix Issue & Create PR
          </Button>
        </div>
      </div>
      {expandedIssue === issue.id && (
        <div className="w-full py-2 px-4">
          <Collapsible open={true}>
            <CollapsibleContent>
              <div className="flex flex-col items-start">
                <div className="flex items-center space-x-2 mb-2">
                  {sseStatus[issue.id] === "connecting" && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />{" "}
                      <span>Connecting...</span>
                    </>
                  )}
                  {sseStatus[issue.id] === "open" && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-green-500" />{" "}
                      <span className="text-green-500">Connected</span>
                    </>
                  )}
                  {sseStatus[issue.id] === "closed" && (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-500" />{" "}
                      <span className="text-yellow-500">Connection closed</span>
                    </>
                  )}
                </div>
                <ScrollArea className="h-40 w-full border rounded-md p-4">
                  {logs[issue.id]?.map((log, index) => (
                    <div key={index} className="mb-2">
                      <span className="text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="ml-2">{log.message}</span>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  )
}
