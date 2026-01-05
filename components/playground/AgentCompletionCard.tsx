"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { getAgentCompletion } from "@/lib/actions/openaiAgent"

export default function AgentCompletionCard() {
  const [systemPrompt, setSystemPrompt] = useState("")
  const [userPrompt, setUserPrompt] = useState("")
  const [response, setResponse] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    setResponse(null)
    startTransition(async () => {
      const res = await getAgentCompletion({
        systemPrompt,
        userPrompt,
      })
      setResponse(res)
    })
  }

  return (
    <Card className="max-w-2xl w-full mx-auto">
      <CardHeader>
        <CardTitle>OpenAI Agent Completion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">System Prompt</p>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={12}
            placeholder="Enter system prompt"
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">User Prompt</p>
          <Textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={4}
            placeholder="Enter user prompt"
          />
        </div>
        <Button onClick={handleSubmit} disabled={isPending} type="button">
          {isPending ? "Sending..." : "Send"}
        </Button>
        {response !== null && (
          <Textarea readOnly value={response} rows={10} className="mt-4" />
        )}
      </CardContent>
    </Card>
  )
}
