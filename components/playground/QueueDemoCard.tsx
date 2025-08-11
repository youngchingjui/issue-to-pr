"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function QueueDemoCard() {
  const queueName = "demo"
  const [length, setLength] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    const res = await fetch(`/api/queue/${queueName}`)
    if (!res.ok) return
    const data = (await res.json()) as { length: number }
    setLength(data.length)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addJob = async () => {
    setLoading(true)
    await fetch(`/api/queue/${queueName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ timestamp: Date.now() }),
    })
    await refresh()
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redis Queue Demo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          Queue <code>{queueName}</code> length: {length}
        </p>
        <Button onClick={addJob} disabled={loading}>
          {loading ? "Adding…" : "Add Job"}
        </Button>
        <Button variant="outline" onClick={refresh} className="ml-2">
          Refresh
        </Button>
      </CardContent>
    </Card>
  )
}

