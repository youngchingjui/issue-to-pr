"use client"

import { useEffect, useRef, useState } from "react"

import {
  type EnqueueJobsRequest,
  enqueueJobsResponseSchema,
} from "@/app/api/queues/[queueId]/jobs/schemas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/lib/hooks/use-toast"
import { WORKFLOW_JOBS_QUEUE } from "@/shared/entities/Queue"

export default function LongRunningWorkflowCard() {
  const { toast } = useToast()
  const [seconds, setSeconds] = useState<number>(10)
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
        toast({ title: "Long-running workflow complete" })
        es.close()
        esRef.current = null
        setIsRunning(false)
      } else if (data.startsWith("Failed:")) {
        const message = data.replace(/^Failed:\s*/, "")
        setError(message)
        toast({
          title: "Long-running workflow failed",
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
    setStatus(null)

    try {
      const queueId = WORKFLOW_JOBS_QUEUE
      const job: EnqueueJobsRequest = {
        name: "simulateLongRunningWorkflow",
        data: { seconds },
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulate Long-running Workflow (Worker Queue)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Seconds to run</Label>
          <Input
            type="number"
            min={1}
            value={Number.isFinite(seconds) ? seconds : ""}
            onChange={(e) => setSeconds(Math.max(1, Number(e.target.value)))}
          />
        </div>
        <Button onClick={handleSubmit} disabled={isRunning}>
          {isRunning ? "Running..." : "Enqueue job"}
        </Button>
        {status && (
          <p className="text-sm text-muted-foreground">Status: {status}</p>
        )}
        {error && <p className="text-destructive text-sm">{error}</p>}
        {jobId && (
          <p className="text-xs text-muted-foreground">Job ID: {jobId}</p>
        )}
      </CardContent>
    </Card>
  )
}
