"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  PlanEvaluationResult,
  PlanEvaluationSchema,
} from "@/lib/types/evaluation"

export default function PlanEvalCard() {
  const [plan, setPlan] = useState("")
  const [result, setResult] = useState<PlanEvaluationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleRun = async () => {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch("/api/playground/evals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Request failed")
        }
        const data = await res.json()
        const parsed = PlanEvaluationSchema.safeParse(data.result)
        if (!parsed.success) {
          throw new Error("Invalid response from server")
        }
        setResult(parsed.data)
      } catch (e: unknown) {
        setResult(null)
        setError(String(e))
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan Evaluation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          placeholder="Paste plan here..."
          rows={10}
          disabled={isPending}
        />
        <Button onClick={handleRun} disabled={isPending || !plan.trim()}>
          {isPending ? "Evaluating..." : "Run Evaluation"}
        </Button>
        {result && (
          <div className="space-y-1 text-sm">
            <div>{result.noTypeCasting ? "✅" : "❌"}&nbsp;No Type Casting</div>
            <div>
              {result.noAnyTypes ? "✅" : "❌"}&nbsp;No <code>any</code> Types
            </div>
            <div>
              {result.noSingleItemHelper ? "✅" : "❌"}&nbsp;No One-off
              Conversion Helper
            </div>
            <div>
              {result.noUnnecessaryDestructuring ? "✅" : "❌"}&nbsp;No
              Unnecessary Destructuring
            </div>
          </div>
        )}
        {error && <div className="text-destructive text-sm">{error}</div>}
      </CardContent>
    </Card>
  )
}
