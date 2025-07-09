"use client"

import { useState, useTransition } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

// Will be imported dynamically by page for Server Action
const createPlanVersionServer =
  typeof window === "undefined"
    ? (await import("@/lib/neo4j/services/plan")).createPlanVersionServer
    : undefined

export default function PlanVersionCard() {
  const [mode, setMode] = useState<"plan" | "workflow">("plan")
  const [id, setId] = useState("")
  const [content, setContent] = useState("")
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)
    startTransition(async () => {
      try {
        if (!id || !content) {
          setError("Please provide an ID and plan content.")
          return
        }
        const args =
          mode === "plan"
            ? { planId: id, content }
            : { workflowId: id, content }
        // Dynamic import for server action; workaround for nextjs server action limitations in playground
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const action =
          typeof window === "undefined"
            ? createPlanVersionServer
            : (await import("@/lib/neo4j/services/plan")).createPlanVersionServer
        if (!action) throw new Error("Server action not available in client context.")
        const res = await action(args)
        setResult(res)
      } catch (e: any) {
        setError(e?.message || "Unexpected error")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Plan Version</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex gap-4 items-center mb-2">
            <Label>
              <input
                className="mr-1"
                type="radio"
                name="mode"
                value="plan"
                checked={mode === "plan"}
                onChange={() => setMode("plan")}
              />
              Plan ID
            </Label>
            <Label>
              <input
                className="mr-1"
                type="radio"
                name="mode"
                value="workflow"
                checked={mode === "workflow"}
                onChange={() => setMode("workflow")}
              />
              Workflow ID
            </Label>
          </div>
          <div>
            <Label htmlFor="id">{mode === "plan" ? "Plan ID" : "Workflow ID"}</Label>
            <Input
              name="id"
              id="id"
              placeholder={`Enter a ${mode} ID`}
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div>
            <Label htmlFor="content">Plan Content (markdown)</Label>
            <Textarea
              name="content"
              id="content"
              placeholder="Enter new plan version text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isPending}
              rows={6}
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create Version"}
          </Button>
        </form>
        {error && (
          <div className="text-red-500 py-2">Error: {error}</div>
        )}
        {result && (
          <div className="mt-4 p-2 rounded bg-green-50 border text-green-800 text-sm">
            New version created:<br />
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

