"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function AnthropicIssueTitleCard() {
  const [description, setDescription] = useState("")
  const [title, setTitle] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!description.trim()) return
    setIsRunning(true)
    setError(null)
    setTitle(null)
    try {
      const res = await fetch("/api/playground/issue-title-anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unknown error")
      setTitle(data.title as string)
    } catch (err) {
      setError(String(err))
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue Description ➜ Title (Anthropic)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Paste GitHub issue description here..."
          />
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isRunning || !description.trim()}
        >
          {isRunning ? "Generating..." : "Generate Title"}
        </Button>
        {error && <p className="text-destructive text-sm">{error}</p>}
        {title && (
          <div className="space-y-2">
            <Label>Suggested Title</Label>
            <Input readOnly value={title} onFocus={(e) => e.target.select()} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
