"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  enqueueErrorResponseSchema,
  type EnqueueRequest,
  enqueueResponseSchema,
} from "shared"
import { QUEUE_NAMES, type QueueName } from "shared"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type QueueCounts = {
  waiting?: number
  active?: number
  completed?: number
  failed?: number
  delayed?: number
}

type QueueStatus = {
  name: QueueName
  counts: QueueCounts
  activeJobs: Array<{
    id: string
    name: string
    progress: number | object | undefined
    data: unknown
    timestamp?: number
    processedOn?: number | null
  }>
  recentCompleted: unknown[]
  recentFailed: unknown[]
  workers: unknown[]
}

export default function WorkerDashboardCard() {
  const [queueName, setQueueName] = useState<QueueName>(
    QUEUE_NAMES.RESOLVE_ISSUE
  )
  const [issueNumber, setIssueNumber] = useState<string>("123")
  const [repoFullName, setRepoFullName] = useState<string>(
    "issue-to-pr/test-repo"
  )
  const [jobId, setJobId] = useState<string>("")
  const [posting, setPosting] = useState(false)
  const [status, setStatus] = useState<QueueStatus[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const refresh = useCallback(async () => {
    const res = await fetch("/api/queues/status", { cache: "no-store" })
    if (res.ok) {
      const json = await res.json()
      setStatus(json.status)
    }
  }, [])

  useEffect(() => {
    refresh()
    timerRef.current = setInterval(refresh, 2000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [refresh])

  const queueOptions = useMemo(
    () => [
      { value: QUEUE_NAMES.RESOLVE_ISSUE, label: "resolve-issue" },
      { value: QUEUE_NAMES.COMMENT_ON_ISSUE, label: "comment-on-issue" },
      { value: QUEUE_NAMES.AUTO_RESOLVE_ISSUE, label: "auto-resolve-issue" },
    ],
    []
  )

  const handleEnqueue = useCallback(async () => {
    setPosting(true)
    try {
      const baseJobData = {
        issueNumber: Number(issueNumber) || 123,
        repoFullName,
        jobId: crypto.randomUUID(),
      }

      // Construct request body according to the API schema
      let requestBody: EnqueueRequest
      switch (queueName) {
        case QUEUE_NAMES.RESOLVE_ISSUE:
          requestBody = {
            queueName: QUEUE_NAMES.RESOLVE_ISSUE,
            data: { ...baseJobData, createPR: true },
          }
          break
        case QUEUE_NAMES.COMMENT_ON_ISSUE:
          requestBody = {
            queueName: QUEUE_NAMES.COMMENT_ON_ISSUE,
            data: { ...baseJobData, postToGithub: false },
          }
          break
        case QUEUE_NAMES.AUTO_RESOLVE_ISSUE:
          requestBody = {
            queueName: QUEUE_NAMES.AUTO_RESOLVE_ISSUE,
            data: baseJobData,
          }
          break
        default:
          throw new Error(`Unknown queue name: ${queueName}`)
      }

      const res = await fetch("/api/queues/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (res.ok) {
        const responseJson = await res.json()
        const parseResult = enqueueResponseSchema.safeParse(responseJson)

        if (parseResult.success) {
          setJobId(parseResult.data.jobId)
        } else {
          console.error("Invalid response format:", parseResult.error)
        }
      } else {
        const errorJson = await res.json()
        const parseResult = enqueueErrorResponseSchema.safeParse(errorJson)

        if (parseResult.success) {
          console.error("Enqueue failed:", parseResult.data)
        } else {
          console.error("Enqueue failed with invalid error format:", errorJson)
        }
      }
    } finally {
      setPosting(false)
      refresh()
    }
  }, [queueName, issueNumber, repoFullName, refresh])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workers & Queues Dashboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label>Queue</Label>
            <Select
              value={queueName}
              onValueChange={(v: QueueName) => setQueueName(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select queue" />
              </SelectTrigger>
              <SelectContent>
                {queueOptions.map((q) => (
                  <SelectItem key={q.value} value={q.value}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Issue number</Label>
            <Input
              value={issueNumber}
              onChange={(e) => setIssueNumber(e.target.value)}
            />
          </div>
          <div>
            <Label>Repo full name</Label>
            <Input
              value={repoFullName}
              onChange={(e) => setRepoFullName(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleEnqueue} disabled={posting}>
              {posting ? "Enqueuing..." : "Enqueue mock job"}
            </Button>
          </div>
        </div>

        {jobId ? (
          <div className="text-sm text-muted-foreground">
            Last enqueued job id: {jobId}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {status.map((q) => (
            <div key={q.name} className="rounded border p-3 space-y-2">
              <div className="font-medium">Queue: {q.name}</div>
              <div className="grid grid-cols-5 gap-2 text-xs">
                <div>waiting: {q.counts.waiting ?? 0}</div>
                <div>active: {q.counts.active ?? 0}</div>
                <div>completed: {q.counts.completed ?? 0}</div>
                <div>failed: {q.counts.failed ?? 0}</div>
                <div>delayed: {q.counts.delayed ?? 0}</div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Active jobs</div>
                <div className="space-y-1 text-xs">
                  {q.activeJobs.length === 0 ? (
                    <div className="text-muted-foreground">None</div>
                  ) : (
                    q.activeJobs.map((j) => (
                      <div key={j.id} className="rounded bg-muted p-2">
                        <div className="flex justify-between">
                          <span>#{j.id}</span>
                          <span>
                            progress:{" "}
                            {typeof j.progress === "number"
                              ? `${j.progress}%`
                              : "-"}
                          </span>
                        </div>
                        <div className="truncate text-muted-foreground">
                          {JSON.stringify(j.data)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Workers</div>
                <div className="space-y-1 text-xs">
                  {!q.workers || q.workers.length === 0 ? (
                    <div className="text-muted-foreground">
                      No workers reported
                    </div>
                  ) : (
                    q.workers.map((w: unknown, idx: number) => {
                      const worker = w as Record<string, unknown>
                      return (
                        <div key={idx} className="rounded bg-muted p-2">
                          <div className="flex justify-between">
                            <span>
                              {String(worker.name || worker.id || "worker")}
                            </span>
                            <span>
                              concurrency: {String(worker.concurrency ?? "-")}
                            </span>
                          </div>
                          {worker.processed ? (
                            <div className="text-muted-foreground">
                              processed: {String(worker.processed)}
                            </div>
                          ) : null}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Recently completed</div>
                <div className="space-y-1 text-xs">
                  {q.recentCompleted.length === 0 ? (
                    <div className="text-muted-foreground">None</div>
                  ) : (
                    q.recentCompleted.map((j: unknown) => {
                      const job = j as Record<string, unknown>
                      return (
                        <div
                          key={String(job.id)}
                          className="rounded bg-muted p-2"
                        >
                          <div className="flex justify-between">
                            <span>#{String(job.id)}</span>
                            <span>done</span>
                          </div>
                          <div className="truncate text-muted-foreground">
                            {JSON.stringify(job.returnvalue ?? job.data)}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Recently failed</div>
                <div className="space-y-1 text-xs">
                  {q.recentFailed.length === 0 ? (
                    <div className="text-muted-foreground">None</div>
                  ) : (
                    q.recentFailed.map((j: unknown) => {
                      const job = j as Record<string, unknown>
                      return (
                        <div
                          key={String(job.id)}
                          className="rounded bg-muted p-2"
                        >
                          <div className="flex justify-between">
                            <span>#{String(job.id)}</span>
                            <span>failed</span>
                          </div>
                          <div className="truncate text-muted-foreground">
                            {String(job.failedReason)}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
