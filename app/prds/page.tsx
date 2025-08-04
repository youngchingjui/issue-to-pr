"use client"

// TODO: Make this a server component and move any state and user interaction to separate client components.

import { useEffect, useState } from "react"
import { v4 as uuidv4 } from "uuid"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface PRD {
  id: string
  title: string
  content: string
  createdAt: number
}

// Local storage key for persisting PRDs between sessions
const STORAGE_KEY = "local_prds"

const loadPrds = (): PRD[] => {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PRD[]) : []
  } catch {
    return []
  }
}

const savePrds = (prds: PRD[]) => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prds))
}

export default function PRDPage() {
  const [prds, setPrds] = useState<PRD[]>([])
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  // Load persisted PRDs once on mount
  useEffect(() => {
    setPrds(loadPrds())
  }, [])

  // Persist to localStorage whenever prds change
  useEffect(() => {
    savePrds(prds)
  }, [prds])

  const resetForm = () => {
    setTitle("")
    setContent("")
  }

  const handleCreate = () => {
    if (!title.trim()) return
    const newPrd: PRD = {
      id: uuidv4(),
      title: title.trim(),
      content,
      createdAt: Date.now(),
    }
    setPrds([newPrd, ...prds])
    resetForm()
  }

  const handleDelete = (id: string) => {
    if (!confirm("Delete this PRD?")) return
    setPrds(prds.filter((p) => p.id !== id))
  }

  return (
    <div className="container max-w-screen-md mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Product Requirement Documents</h1>

      {/* Create new PRD */}
      <div className="space-y-4 border p-4 rounded-md">
        <h2 className="text-lg font-semibold">New PRD</h2>
        <Input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          rows={8}
          placeholder="Markdown content..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button onClick={handleCreate} disabled={!title.trim()}>
          Save PRD
        </Button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {prds.length === 0 && <p>No PRDs yet.</p>}
        {prds.map((prd) => (
          <div
            key={prd.id}
            className="border rounded-md p-4 space-y-2 bg-background"
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-lg font-semibold">{prd.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(prd.createdAt).toLocaleString()}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(prd.id)}
              >
                Delete
              </Button>
            </div>
            {prd.content && (
              <pre className="whitespace-pre-wrap text-sm border-t pt-2 mt-2">
                {prd.content}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
