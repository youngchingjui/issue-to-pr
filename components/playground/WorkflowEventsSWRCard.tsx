"use client"

import { useState } from "react"
import useSWR from "swr"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AnyEvent } from "@/lib/types"

const fetcher = async (url: string): Promise<AnyEvent[]> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch")
  const json = await res.json()
  return json.events as AnyEvent[]
}

export default function WorkflowEventsSWRCard() {
  const [workflowId, setWorkflowId] = useState("")

  const { data, isValidating, mutate } = useSWR(
    workflowId ? `/api/workflow-runs/${workflowId}/events` : null,
    fetcher,
    {
      refreshInterval: workflowId ? 1000 : 0,
      keepPreviousData: true,
    }
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Events (SWR)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Workflow ID"
            value={workflowId}
            onChange={(e) => setWorkflowId(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() => mutate()}
            disabled={!workflowId || isValidating}
          >
            Refresh
          </Button>
        </div>
        <div className="space-y-1 text-sm">
          {data?.map((e) => (
            <div key={e.id} className="font-mono">
              <span className="font-semibold mr-1">{e.type}</span>
              {e.content ?? ""}
            </div>
          ))}
          {!data && workflowId && <div>Loading…</div>}
        </div>
      </CardContent>
    </Card>
  )
}
