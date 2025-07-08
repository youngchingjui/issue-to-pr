"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import { v4 as uuidv4 } from "uuid"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const DEMO_PREFIX = "demo-swr-"

function fetcher(url: string) {
  return fetch(url).then((res) => res.json())
}

export default function SWRDemoCard() {
  // Current selected run for viewing events (optional, just placeholder for UI flow)
  const [selectedRun, setSelectedRun] = useState<string | null>(null)
  const {
    data: demoRuns,
    isLoading,
    mutate,
  } = useSWR(`/api/workflow?demoOnly=1`, fetcher, { refreshInterval: 3000 })
  const [launching, setLaunching] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Launch a new demo workflow
  const handleLaunchDemo = useCallback(async () => {
    setLaunching(true)
    try {
      await fetch(`/api/workflow/demo`, { method: "POST" })
      await mutate()
    } finally {
      setLaunching(false)
    }
  }, [mutate])

  // Delete a demo workflow run by id
  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id)
      await fetch(`/api/workflow/${id}`, { method: "DELETE" })
      await mutate()
      setDeletingId(null)
      if (selectedRun === id) setSelectedRun(null)
    },
    [mutate, selectedRun]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>SWR Demo: Workflow Run & Events</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Button
          size="sm"
          variant="outline"
          className="w-fit"
          onClick={handleLaunchDemo}
          disabled={launching}
        >
          {launching ? "Launching…" : "Launch Demo Workflow"}
        </Button>
        <div>
          <div className="font-semibold mb-1">Active Demo Workflow Runs:</div>
          {isLoading ? (
            <div>Loading…</div>
          ) : demoRuns && demoRuns.length === 0 ? (
            <div>No demo runs in progress.</div>
          ) : (
            <ul className="space-y-2">
              {demoRuns?.map((run: any) => (
                <li key={run.id} className="flex items-center gap-2 border rounded px-3 py-2">
                  <code className="text-xs font-mono text-muted-foreground">{run.id}</code>
                  <span className="ml-2 badge bg-muted px-2 rounded text-xs">{run.state}</span>
                  <Button
                    size="xs"
                    variant={selectedRun === run.id ? "default" : "secondary"}
                    onClick={() => setSelectedRun(run.id)}
                    disabled={selectedRun === run.id}
                  >
                    View Events
                  </Button>
                  <Button
                    size="xs"
                    onClick={() => handleDelete(run.id)}
                    variant="destructive"
                    disabled={deletingId === run.id}
                  >
                    {deletingId === run.id ? "Deleting…" : "Delete"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedRun && (
          <DemoWorkflowEventStream runId={selectedRun} key={selectedRun} />
        )}
        <div className="mt-2 text-xs text-muted-foreground">
          This demo allows you to create, list, and remove test workflows. Selecting a workflow subscribes to its real-time events (useful for SWR/SSE demo).
        </div>
      </CardContent>
    </Card>
  )
}

function DemoWorkflowEventStream({ runId }: { runId: string }) {
  // We'll use SWR polling to fetch latest events array – in real app this might be SSE.
  const {
    data: details,
    isLoading,
    mutate,
  } = useSWR(`/api/workflow/${runId}`, fetcher, { refreshInterval: 1000 })
  return (
    <div className="border rounded px-3 py-2 mt-1 bg-muted">
      <div className="font-semibold">Events for {runId}</div>
      {isLoading || !details ? (
        <div>Loading events…</div>
      ) : details.events && details.events.length === 0 ? (
        <div>No events yet.</div>
      ) : (
        <ol className="text-xs font-mono mt-2 space-y-1">
          {details.events.map((ev: any, i: number) => (
            <li key={ev.id ?? i}>
              <span className="text-muted-foreground mr-1">[{new Date(ev.createdAt).toLocaleTimeString()}]</span>"
              <span>{typeof ev.content === "string" ? ev.content : JSON.stringify(ev.content)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

