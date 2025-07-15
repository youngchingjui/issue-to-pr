"use client"

import { useState } from "react"

import MarkdownRenderer from "@/components/blog/MarkdownRenderer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Plan753EvaluationResult as PlanEvaluationResult } from "@/lib/evals/evalTool"
import {
  evaluatePlan,
  PlanEvaluationResultFull,
} from "@/lib/evals/evaluatePlan"

// Extend the base evaluation result with optional metadata that only exists in the
// playground UI (error placeholder + LLM markdown content). These fields are not
// part of the original schema returned by the EvalAgent but are useful for
// multi-run display purposes.
type PlanEvaluationResultWithMeta = Partial<PlanEvaluationResult> & {
  /** Present when an individual run fails — used to render the error state */
  error?: string
  /** Raw markdown / explanation returned by the LLM (if captured separately) */
  content?: string
}

// Add default score flags just after PlanEvaluationResultWithMeta type definition
const DEFAULT_SCORE_FLAGS: Partial<PlanEvaluationResult> = {}

function LoadingSpinner() {
  return (
    <div
      className="flex items-center gap-2 mt-4 mb-2"
      role="status"
      aria-label="Loading"
    >
      <svg
        className="animate-spin h-5 w-5 text-muted-foreground mr-2"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8H4z"
        />
      </svg>
      <span className="text-muted-foreground text-sm">
        Running evaluations...
      </span>
    </div>
  )
}

export default function PlanEvalCard() {
  const [plan, setPlan] = useState("")
  const [runCount, setRunCount] = useState(2)
  const [results, setResults] = useState<PlanEvaluationResultWithMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openPopoverIdx, setOpenPopoverIdx] = useState<number | null>(null)

  // utility to extract assistant message's content field from the new API (PlanEvaluationResultFull)
  function extractContentFromMsg(msg): string | undefined {
    if (!msg) return undefined
    if (typeof msg.content === "string") return msg.content
    if (Array.isArray(msg.content)) {
      // OpenAI-style content (could be string[] or ContentPart[])
      return msg.content
        .map((c) => (typeof c === "string" ? c : (c.text ?? "")))
        .join(" ")
    }
    return undefined
  }

  // Helper function to transform evaluatePlan result to PlanEvaluationResultWithMeta
  function transformEvaluationResult(
    data: PlanEvaluationResultFull
  ): PlanEvaluationResultWithMeta {
    // New envelope style: { result?: PlanEvaluationResult, message: ChatMessage }
    if (data && typeof data === "object" && "message" in data) {
      const baseResult =
        "result" in data && data.result ? data.result : undefined

      return {
        ...DEFAULT_SCORE_FLAGS,
        ...(baseResult ?? {}),
        content: extractContentFromMsg(data.message),
      }
    }

    // Legacy style: API already returned the result object directly
    return {
      ...DEFAULT_SCORE_FLAGS,
      ...(data as PlanEvaluationResult),
    }
  }

  // Run evaluations the specified number of times
  async function runEvaluations(count: number) {
    // Reset state
    setError(null)
    setResults([])
    setOpenPopoverIdx(null)
    setLoading(true)

    // Pre-seed the results array so the table renders immediately
    setResults(
      Array.from({ length: count }, () => ({}) as PlanEvaluationResultWithMeta)
    )

    try {
      // Kick off all evaluations concurrently - call evaluatePlan directly for better performance
      const parallelPromises = Array.from({ length: count }).map(
        async (_, idx) => {
          try {
            const data = await evaluatePlan(plan)
            const res = transformEvaluationResult(data)
            // Update the specific index as soon as its promise resolves
            setResults((prev) => {
              const next = [...prev]
              next[idx] = res
              return next
            })
            return true // success flag
          } catch (err) {
            // Capture individual failure immediately
            setResults((prev) => {
              const next = [...prev]
              next[idx] = { error: String(err) }
              return next
            })
            return false // failure flag
          }
        }
      )

      // Wait for all evaluations to complete
      const completionFlags = await Promise.all(parallelPromises)

      // If every evaluation failed, surface a generic error message
      const hadSuccess = completionFlags.some((flag) => flag)
      if (!hadSuccess) {
        setError("All evaluation runs failed. See individual errors above.")
      }
    } catch (err) {
      // Catch any unexpected aggregate error
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  // Single run handler that uses the runCount state
  const handleRun = () => runEvaluations(runCount)

  const scoreFields = [
    {
      key: "noTypeAssertions",
      label: "No Type Assertions",
    },
    {
      key: "noAnyTypes",
      label: "No any Types",
    },
    {
      key: "noSingleItemHelper",
      label: "No One-off Conversion Helper",
    },
    {
      key: "noUnnecessaryDestructuring",
      label: "No Unnecessary Destructuring",
    },
  ]

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
          disabled={loading}
        />
        <div className="space-y-2">
          <Label htmlFor="run-count">Number of runs</Label>
          <Input
            id="run-count"
            type="number"
            min="1"
            max="10"
            value={runCount}
            onChange={(e) => {
              const value = Math.max(
                1,
                Math.min(10, parseInt(e.target.value) || 1)
              )
              setRunCount(value)
            }}
            disabled={loading}
            className="w-32"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRun} disabled={loading || !plan.trim()}>
            {loading ? "Running..." : `Run ${runCount} Times`}
          </Button>
        </div>
        {loading && <LoadingSpinner />}
        {error && <div className="text-destructive text-sm">{error}</div>}
        {/* Results table */}
        {results.length > 0 && (
          <div className="overflow-x-auto mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  {results.map((_, i) => (
                    <TableHead key={i}>{`Run ${i + 1}`}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {scoreFields.map((field) => (
                  <TableRow key={field.key}>
                    {results.map((r, idx) => (
                      <TableCell
                        key={idx}
                        className="font-semibold text-center px-2 py-1 text-lg"
                      >
                        {r.error
                          ? "–"
                          : r[field.key as keyof PlanEvaluationResult] === true
                            ? "✅"
                            : r[field.key as keyof PlanEvaluationResult] ===
                                false
                              ? "❌"
                              : "–"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {/* Popover content/markdown row trigger */}
                <TableRow>
                  {results.map((r, idx) => (
                    <TableCell key={idx} className="px-2 py-1 text-center">
                      {r.error ? (
                        <span className="text-destructive text-xs">
                          {r.error}
                        </span>
                      ) : (
                        <Popover
                          open={openPopoverIdx === idx}
                          onOpenChange={(open) =>
                            setOpenPopoverIdx(open ? idx : null)
                          }
                        >
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              View Content
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="min-w-[340px] max-w-[400px] p-4">
                            {/* Render all fields but prioritize markdown if present */}
                            <h4 className="mb-2 font-bold text-md">
                              LLM Content
                            </h4>
                            {typeof r.content === "string" &&
                            r.content.trim() ? (
                              <MarkdownRenderer content={r.content} />
                            ) : (
                              <span className="text-muted-foreground text-sm italic">
                                No markdown/content from LLM.
                              </span>
                            )}
                          </PopoverContent>
                        </Popover>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
