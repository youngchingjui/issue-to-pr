"use client"

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/lib/hooks/use-toast"
import { getApiKeyFromLocalStorage } from "@/lib/utils/utils-common"

interface Props {
  planId: string
  issueNumber: number
  repoFullName: string
}

export default function ResolvePlanButton({ planId, issueNumber, repoFullName }: Props) {
  const [loading, setLoading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)

  const onResolve = useCallback(async () => {
    setLoading(true)
    setJobId(null)
    try {
      const apiKey = getApiKeyFromLocalStorage()
      if (!apiKey) {
        toast({
          title: "API key not found",
          description: "Please save an OpenAI API key first.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueNumber,
          repoFullName,
          apiKey,
          planId,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        toast({
          title: "Failed to start resolve workflow",
          description: data?.error || "Unknown error occurred.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }
      const data = await response.json()
      setJobId(data.jobId)
      toast({
        title: "Resolution started!",
        description: (
          <span>
            Issue is being resolved. Workflow is running.<br />
            <span className="font-mono">Job Id: {data.jobId}</span>
          </span>
        ),
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [issueNumber, repoFullName, planId])

  return (
    <Button variant="default" disabled={loading} onClick={onResolve}>
      {loading ? "Starting..." : "Resolve Issue with this Plan"}
    </Button>
  )
}
