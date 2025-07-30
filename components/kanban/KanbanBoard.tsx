"use client"

import { useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Types
interface Issue {
  id: string
  title: string
}

interface Column {
  id: string
  title: string
  issues: Issue[]
}

// Helper to generate mock data
const createMockData = (): Column[] => [
  {
    id: "todo",
    title: "Todo",
    issues: [
      { id: "1", title: "Set up project" },
      { id: "2", title: "Create initial components" },
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    issues: [{ id: "3", title: "Implement drag & drop" }],
  },
  {
    id: "done",
    title: "Done",
    issues: [{ id: "4", title: "Write docs" }],
  },
]

export default function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>(createMockData())

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    issueId: string,
    sourceColumnId: string
  ) => {
    // Store both the issue id and its source column id
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ issueId, sourceColumnId })
    )
    // Enable move cursor
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetColumnId: string
  ) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData("text/plain")
    if (!raw) return
    const { issueId, sourceColumnId } = JSON.parse(raw) as {
      issueId: string
      sourceColumnId: string
    }

    // Ignore if dropped on same column
    if (sourceColumnId === targetColumnId) return

    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, issues: [...col.issues] }))

      const source = next.find((c) => c.id === sourceColumnId)
      const target = next.find((c) => c.id === targetColumnId)
      if (!source || !target) return prev

      const issueIndex = source.issues.findIndex((i) => i.id === issueId)
      if (issueIndex === -1) return prev

      const [issue] = source.issues.splice(issueIndex, 1)
      target.issues.push(issue)

      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Kanban Board (Mock)</h1>
      <div className="flex gap-4 overflow-x-auto">
        {columns.map((column) => (
          <Card
            key={column.id}
            className="min-w-[250px] w-64 flex-shrink-0 bg-muted/40"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <CardHeader>
              <CardTitle>{column.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 min-h-[100px]">
              {column.issues.map((issue) => (
                <div
                  key={issue.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, issue.id, column.id)}
                  className="rounded-md border bg-background p-2 cursor-move shadow-sm hover:bg-muted"
                >
                  {issue.title}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
