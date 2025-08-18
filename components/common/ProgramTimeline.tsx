"use client"

import React from "react"
import { twMerge } from "tailwind-merge"

type Highlight = {
  week: number
  label?: string
}

export interface ProgramTimelineProps {
  totalWeeks?: number
  blockLengthWeeks?: number
  className?: string
  highlights?: Highlight[]
}

// Renders a simple horizontal timeline in 1-week cells grouped by 2-week blocks.
// Weeks listed are 1-indexed. Weeks in `highlights` are visually circled and labeled.
export default function ProgramTimeline({
  totalWeeks = 16,
  blockLengthWeeks = 2,
  className,
  highlights = [
    { week: 5, label: "Program Review" },
    { week: 12, label: "Program Review" },
  ],
}: ProgramTimelineProps) {
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1)
  const isBlockBoundary = (week: number) => week % blockLengthWeeks === 1
  const highlightMap = new Map(highlights.map((h) => [h.week, h]))

  return (
    <div className={twMerge("w-full", className)}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Program Timeline</h2>
        <div className="text-xs text-muted-foreground">
          1-week cells, grouped by {blockLengthWeeks}-week blocks
        </div>
      </div>

      <div className="relative overflow-x-auto rounded-md border bg-card p-3">
        <div className="grid auto-cols-max grid-flow-col gap-0">
          {weeks.map((week) => {
            const highlight = highlightMap.get(week)
            return (
              <div key={week} className="relative">
                {/* Week cell */}
                <div
                  className={twMerge(
                    "flex h-10 w-10 items-center justify-center border-y text-sm",
                    isBlockBoundary(week)
                      ? "border-l border-r"
                      : "border-r first:border-l",
                    highlight && "z-10"
                  )}
                  aria-label={`Week ${week}${highlight ? ", " + (highlight.label || "highlight") : ""}`}
                >
                  {week}
                </div>

                {/* Block boundary marker every blockLengthWeeks starting at week 1 */}
                {isBlockBoundary(week) && (
                  <div className="absolute -top-5 left-0 right-0 text-center text-[10px] text-muted-foreground">
                    W{week}-{Math.min(week + (blockLengthWeeks - 1), totalWeeks)}
                  </div>
                )}

                {/* Circular highlight for specific weeks */}
                {highlight && (
                  <>
                    <div className="pointer-events-none absolute inset-0 -m-1 rounded-full ring-2 ring-amber-500" />
                    {highlight.label && (
                      <div className="absolute left-1/2 top-12 -translate-x-1/2 whitespace-nowrap rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                        {highlight.label}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full ring-2 ring-amber-500" />
            <span>Program Review</span>
          </div>
          <span>•</span>
          <span>{blockLengthWeeks}-week blocks</span>
        </div>
      </div>
    </div>
  )
}

