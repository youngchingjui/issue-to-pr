"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"

export default function SimpleChatButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onClick = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: "Say hello from Issue To PR" }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Request failed")
      }
      setResult(data.text)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button size="sm" onClick={onClick} disabled={loading}>
        {loading ? "Calling OpenAI..." : "Create simple chat completion"}
      </Button>
      {result && (
        <div className="rounded border p-2 text-sm text-foreground/80">
          {result}
        </div>
      )}
      {error && (
        <div className="rounded border border-destructive p-2 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  )
}
