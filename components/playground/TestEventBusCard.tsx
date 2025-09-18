"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function TestEventBusCard() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleRun = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/workflow/test-event-bus", {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed to start workflow")
      const data = (await res.json()) as { workflowId: string }
      router.push(`/workflow-runs/${data.workflowId}`)
    } catch (e) {
      console.error(e)
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Test Event Bus + Neo4j Workflow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Launches a simple workflow that emits events through the Event Bus
          and persists them to Neo4j. Use this to validate end-to-end event
          flow and UI rendering.
        </p>
        <Button onClick={handleRun} disabled={isLoading} className="w-full">
          {isLoading ? "Running…" : "Run Test Workflow"}
        </Button>
      </CardContent>
    </Card>
  )
}

export default TestEventBusCard

