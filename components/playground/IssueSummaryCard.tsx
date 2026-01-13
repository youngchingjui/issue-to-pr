"use client"

import { useEffect, useRef, useState } from "react"

// TODO: Move this to shared
import {
  type EnqueueJobsRequest,
  enqueueJobsResponseSchema,
} from "@/app/api/queues/[queueId]/jobs/schemas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/lib/hooks/use-toast"
import { WORKFLOW_JOBS_QUEUE } from "@/shared/entities/Queue"

export default function IssueSummaryCard() {
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [summary, setSummary] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    return () => {
      if (esRef.current) {
        esRef.current.close()
      }
    }
  }, [])

  const startSSE = (id: string) => {
    const es = new EventSource(`/api/sse?jobId=${id}`)
    esRef.current = es

    es.onmessage = (event) => {
      const data = event.data
      if (!data) return
      setStatus(data)

      if (data.startsWith("Completed:")) {
        const result = data.replace(/^Completed:\s*/, "")
        setSummary(result)
        toast({ title: "Issue summary ready", description: result })
        es.close()
        esRef.current = null
        setIsRunning(false)
      } else if (data.startsWith("Failed:")) {
        const message = data.replace(/^Failed:\s*/, "")
        setError(message)
        toast({
          title: "Issue summary failed",
          description: message,
          variant: "destructive",
        })
        es.close()
        esRef.current = null
        setIsRunning(false)
      }
    }

    es.onerror = () => {
      setStatus("disconnected")
      es.close()
      esRef.current = null
      setIsRunning(false)
    }
  }

  const handleSubmit = async () => {
    setIsRunning(true)
    setError(null)
    setSummary(null)
    setStatus(null)

    try {
      const queueId = WORKFLOW_JOBS_QUEUE
      const job: EnqueueJobsRequest = {
        name: "summarizeIssue",
        data: { title, body },
      }
      const res = await fetch(`/api/queues/${queueId}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      })
      const { success, data, error } = enqueueJobsResponseSchema.safeParse(
        await res.json()
      )
      if (!success) throw new Error(error.message || "Failed to enqueue job")

      setJobId(data.jobId)
      startSSE(data.jobId)
    } catch (err) {
      const message = String(err)
      setError(message)
      toast({
        title: "Failed to enqueue job",
        description: message,
        variant: "destructive",
      })
      setIsRunning(false)
    }
  }

  const canSubmit = !!body.trim() || !!title.trim()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Summarize GitHub Issue (Worker Queue)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Issue Title (optional)</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short issue title"
          />
        </div>
        <div className="space-y-2">
          <Label>Issue Body</Label>
          <Textarea
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Paste the issue description here..."
          />
        </div>
        <Button onClick={handleSubmit} disabled={isRunning || !canSubmit}>
          {isRunning ? "Summarizing..." : "Send to worker"}
        </Button>
        {status && (
          <p className="text-sm text-muted-foreground">Status: {status}</p>
        )}
        {error && <p className="text-destructive text-sm">{error}</p>}
        {summary && (
          <div className="space-y-2">
            <Label>Summary</Label>
            <Textarea readOnly rows={6} value={summary} />
          </div>
        )}
        {jobId && (
          <p className="text-xs text-muted-foreground">Job ID: {jobId}</p>
        )}
      </CardContent>
    </Card>
  )
}
