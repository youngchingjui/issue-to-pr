"use client"

import { useState, useTransition } from "react"

import MarkdownRenderer from "@/components/blog/MarkdownRenderer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { evaluatePlan } from "@/lib/evals/evaluatePlan"

// Extend the base evaluation result with optional metadata that only exists in the
// playground UI (error placeholder + LLM markdown content). These fields are not
// part of the original schema returned by the EvalAgent but are useful for
// multi-run display purposes.
type PlanEvaluationResultWithMeta = PlanEvaluationResult & {
  /** Present when an individual run fails — used to render the error state */
  __multiRunError?: string
  /** Raw markdown / explanation returned by the LLM (if captured separately) */
  content?: string
}

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
  const [result, setResult] = useState<PlanEvaluationResultWithMeta | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // New: For multi-run
  const [multiResults, setMultiResults] = useState<
    PlanEvaluationResultWithMeta[]
  >([])
  const [multiLoading, setMultiLoading] = useState(false)
  const [multiError, setMultiError] = useState<string | null>(null)
  const [openPopoverIdx, setOpenPopoverIdx] = useState<number | null>(null)

  const handleRun = async () => {
    setError(null)
    setMultiResults([])
    setMultiError(null)
    startTransition(async () => {
      try {
        const data = await evaluatePlan(plan)
        setResult(data)
      } catch (e: unknown) {
        setResult(null)
        setError(String(e))
      }
    })
  }

  // Handler for multi-run (5 evals)
  const handleRunFive = async () => {
    setMultiError(null)
    setError(null)
    setResult(null)
    setMultiResults([])
    setOpenPopoverIdx(null)
    setMultiLoading(true)
    try {
      const requests = Array.from({ length: 5 }).map(() => evaluatePlan(plan))
      const res = await Promise.allSettled(requests)
      const results: PlanEvaluationResultWithMeta[] = []
      let gotAtLeastOne = false
      let firstError: string | null = null
      res.forEach((r) => {
        if (r.status === "fulfilled") {
          results.push(r.value)
          gotAtLeastOne = true
        } else {
          // Insert a placeholder error result (so column is still rendered)
          results.push({
            noTypeAssertions: false,
            noAnyTypes: false,
            noSingleItemHelper: false,
            noUnnecessaryDestructuring: false,
            __multiRunError: r.reason ? String(r.reason) : "Unknown error",
          })
          if (!firstError)
            firstError = r.reason ? String(r.reason) : "Unknown error"
        }
      })
      setMultiResults(results)
      setMultiError(!gotAtLeastOne ? firstError : null)
    } catch (err) {
      setMultiResults([])
      setMultiError(String(err))
    } finally {
      setMultiLoading(false)
    }
  }

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

  // Evaluation content/extras — only available in LLM response, not score;
  // here, assume all fields are returned to us, though in real code we might have to fetch them from events.

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
          disabled={isPending || multiLoading}
        />
        <div className="flex gap-2">
          <Button
            onClick={handleRun}
            disabled={isPending || multiLoading || !plan.trim()}
          >
            {isPending ? "Evaluating..." : "Run Evaluation"}
          </Button>
          <Button
            variant="secondary"
            onClick={handleRunFive}
            disabled={isPending || multiLoading || !plan.trim()}
          >
            {multiLoading ? "Running..." : "Run 5 Times"}
          </Button>
        </div>
        {multiLoading && <LoadingSpinner />}
        {multiError && (
          <div className="text-destructive text-sm">{multiError}</div>
        )}
        {/* Multi-run results table */}
        {multiResults.length > 1 && (
          <div className="overflow-x-auto mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  {multiResults.map((_, i) => (
                    <TableHead key={i}>{`Run ${i + 1}`}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {scoreFields.map((field) => (
                  <TableRow key={field.key}>
                    {multiResults.map((r, idx) => (
                      <TableCell
                        key={idx}
                        className="font-semibold text-center px-2 py-1 text-lg"
                      >
                        {r.__multiRunError ? (
                          <span className="text-destructive">Error</span>
                        ) : r[field.key as keyof PlanEvaluationResult] ? (
                          "✅"
                        ) : (
                          "❌"
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {/* Popover content/markdown row trigger */}
                <TableRow>
                  {multiResults.map((r, idx) => (
                    <TableCell key={idx} className="px-2 py-1 text-center">
                      {r.__multiRunError ? (
                        <span className="text-destructive text-xs">
                          {r.__multiRunError}
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
        {/* Single-run fallback (original UI) */}
        {!multiResults.length && result && (
          <div className="space-y-1 text-sm mt-2">
            <div>
              {result.noTypeAssertions ? "✅" : "❌"}&nbsp;No Type Assertions
            </div>
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
