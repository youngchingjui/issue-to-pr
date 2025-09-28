"use client"

import { useEffect, useRef, useState } from "react"
import { WORKFLOW_JOBS_QUEUE } from "shared/entities/Queue"

import { type EnqueueJobsRequest } from "@/app/api/queues/[queueId]/jobs/schemas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/lib/hooks/use-toast"

interface Props {
  githubLogin: string
}

export default function AutoResolveIssueCard({ githubLogin }: Props) {
  const { toast } = useToast()
  const [repoFullName, setRepoFullName] = useState("")
  const [issueNumber, setIssueNumber] = useState<number | "">("")
  const [branch, setBranch] = useState("")
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
        toast({ title: "Auto-resolve workflow completed" })
        es.close()
        esRef.current = null
        setIsRunning(false)
      } else if (data.startsWith("Failed:")) {
        const message = data.replace(/^Failed:\s*/, "")
        setError(message)
        toast({
          title: "Auto-resolve workflow failed",
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
      const data: EnqueueJobsRequest = {
        jobs: [
          {
            name: "autoResolveIssue",
            data: {
              repoFullName,
              issueNumber:
                typeof issueNumber === "string"
                  ? Number(issueNumber)
                  : issueNumber,
              branch: branch.trim() || undefined,
              githubLogin,
            },
          },
        ],
      }
      const res = await fetch(`/api/queues/${queueId}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to enqueue job")
      const id = (json.jobIds?.[0] as string) || null
      if (!id) throw new Error("No job id returned from API")
      setJobId(id)
      startSSE(id)
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

  const canSubmit = Boolean(repoFullName.trim()) && Number(issueNumber) > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto-Resolve Issue (Worker Queue)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Repository Full Name</Label>
          <Input
            value={repoFullName}
            onChange={(e) => setRepoFullName(e.target.value)}
            placeholder="owner/repo"
          />
        </div>
        <div className="space-y-2">
          <Label>Issue Number</Label>
          <Input
            type="number"
            min={1}
            value={issueNumber}
            onChange={(e) =>
              setIssueNumber(Math.max(1, Number(e.target.value)))
            }
            placeholder="123"
          />
        </div>
        <div className="space-y-2">
          <Label>Branch (optional)</Label>
          <Input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="feature/my-branch"
          />
        </div>
        <Button onClick={handleSubmit} disabled={isRunning || !canSubmit}>
          {isRunning ? "Starting..." : "Enqueue job"}
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
