"use client"

import { formatDistanceToNow } from "date-fns"
import { ChevronDown, Loader2, MessageCircle, PlayCircle } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import React from "react"

import CreatePullRequestButton from "@/components/issues/workflows/CreatePullRequestButton"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import { GitHubIssue, GitHubRepository } from "@/lib/types"
import { getApiKeyFromLocalStorage, SSEUtils } from "@/lib/utils"

type Log = {
  message: string
  timestamp: string
}

interface IssueRowProps {
  issue: GitHubIssue
  repo: GitHubRepository
}

export default function IssueRow({ issue, repo }: IssueRowProps) {
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null)
  const [logs, setLogs] = useState<Record<string, Log[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [sseStatus, setSseStatus] = useState<
    Record<string, "connecting" | "working" | "closed">
  >({})

  const apiKey = getApiKeyFromLocalStorage()

  const handleAddComment = async (issueId: number) => {
    setExpandedIssue(issueId)
    setLogs({})
    setIsLoading(true)
    setSseStatus({ [issueId]: "connecting" })

    try {
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
      const eventSource = new EventSource(`/api/sse?jobId=${jobId}`)

      setSseStatus({ [issueId]: "working" })

      eventSource.onmessage = (event) => {
        const status = SSEUtils.decodeStatus(event.data)
        setLogs((prev) => ({
          ...prev,
          [issueId]: [
            ...(prev[issueId] || []),
            {
              message: status,
              timestamp: new Date().toISOString(),
            },
          ],
        }))

        if (status === "Stream finished") {
          setSseStatus({ [issueId]: "closed" })
          setLogs((prev) => ({
            ...prev,
            [issueId]: [
              ...(prev[issueId] || []),
              {
                message: "GitHub comment created",
                timestamp: new Date().toISOString(),
              },
            ],
          }))
          eventSource.close()
          setIsLoading(false)
        } else if (
          status.startsWith("Completed") ||
          status.startsWith("Failed")
        ) {
          setSseStatus((prev) => ({ ...prev, [issueId]: "closed" }))
          eventSource.close()
          setIsLoading(false)
        }
      }

      eventSource.onerror = (event) => {
        console.error("SSE connection failed:", event)
        setSseStatus((prev) => ({ ...prev, [issueId]: "closed" }))
        setIsLoading(false)
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
      setIsLoading(false)
    }
  }

  return (
    <TableRow>
      <TableCell className="py-4">
        <div className="flex flex-col gap-1">
          <div className="font-medium text-base">
            <Link
              href={`https://github.com/${repo.full_name}/issues/${issue.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {issue.title}
            </Link>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span>#{issue.number}</span>
            <span>•</span>
            <span>{issue.user.login}</span>
            <span>•</span>
            <span>{issue.state}</span>
            <span>•</span>
            <span>
              Updated{" "}
              {formatDistanceToNow(new Date(issue.updated_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell>{issue.state}</TableCell>
      <TableCell>
        <Button
          onClick={() => handleAddComment(issue.id)}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding comment...
            </>
          ) : (
            <>
              <MessageCircle className="mr-2 h-4 w-4" />
              Add Comment
            </>
          )}
        </Button>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Working...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Actions
                  <ChevronDown className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem onClick={() => handleAddComment(issue.id)}>
              <div>
                <div>Add GitHub Comment</div>
                <div className="text-xs text-muted-foreground">
                  Add an AI-generated comment
                </div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <CreatePullRequestButton issueNumber={issue.number} repo={repo} />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
      {expandedIssue === issue.id && logs[issue.id]?.length > 0 && (
        <div className="absolute left-0 right-0 bg-background border-t p-4 mt-2">
          <div className="flex flex-col space-y-2 max-h-40 overflow-y-auto">
            {logs[issue.id].map((log, index) => (
              <div key={index} className="text-sm">
                <span className="text-muted-foreground">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="ml-2">
                  {log.message.split("\\n\\n").map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </TableRow>
  )
}
