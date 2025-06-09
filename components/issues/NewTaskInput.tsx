"use client"

import { useEffect, useState } from "react"
import { HelpCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "@/lib/hooks/use-toast"

type Task = {
  id: number
  title: string
  description: string
  createdAt: string
  synced: boolean
}

interface Props {
  repoFullName: string
}

// Local storage key for toggle state per repo
const getSyncKey = (repo: string) => `syncWithGitHub:${repo}`
const getTasksKey = (repo: string) => `localTasks:${repo}`

export default function NewTaskInput({ repoFullName }: Props) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [syncWithGitHub, setSyncWithGitHub] = useState<boolean>(true)
  const [loading, setLoading] = useState(false)

  // Load/persist toggle state
  useEffect(() => {
    const syncPref = localStorage.getItem(getSyncKey(repoFullName))
    if (syncPref !== null) setSyncWithGitHub(syncPref === "true")
  }, [repoFullName])
  useEffect(() => {
    localStorage.setItem(getSyncKey(repoFullName), String(syncWithGitHub))
  }, [syncWithGitHub, repoFullName])

  // Helper: call LLM, stub fetch to /api/openai/check as suggest title
  const fetchSuggestedTitle = async (desc: string) => {
    // Just a stub for demo. You may want to change endpoint/params.
    try {
      const resp = await fetch("/api/openai/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc }),
      })
      if (!resp.ok) throw new Error("Failed to get title suggestion")
      const data = await resp.json()
      return data.title || "New Task"
    } catch {
      return "New Task"
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please enter a description for your task.",
        variant: "destructive",
      })
      return
    }
    setLoading(true)
    let taskTitle = title.trim()
    try {
      if (!taskTitle) {
        // Get LLM suggestion (shows interim loading toast)
        toast({
          title: "Suggesting title...",
          description: "Calling LLM for a title.",
        })
        taskTitle = await fetchSuggestedTitle(description)
      }
      if (syncWithGitHub) {
        // POST to backend stub (no backend implemented yet)
        const resp = await fetch("/api/issues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoFullName, title: taskTitle, description }),
        })
        if (!resp.ok) {
          throw new Error(
            (await resp.json()).message || "Failed to create GitHub issue."
          )
        }
        toast({
          title: "Task synced to GitHub",
          description: `Created: ${taskTitle}`,
          variant: "default",
        })
      } else {
        // Local storage save
        const tasksKey = getTasksKey(repoFullName)
        const old = localStorage.getItem(tasksKey)
        let tasks: Task[] = []
        if (old) {
          try {
            tasks = JSON.parse(old)
          } catch {}
        }
        const newTask = {
          id: Date.now(),
          title: taskTitle,
          description,
          createdAt: new Date().toISOString(),
          synced: false,
        }
        tasks.unshift(newTask)
        localStorage.setItem(tasksKey, JSON.stringify(tasks))
        toast({
          title: "Task saved locally",
          description: `Created: ${taskTitle}`,
          variant: "default",
        })
      }
      setTitle("")
      setDescription("")
    } catch (err: unknown) {
      toast({
        title: "Error creating task",
        description: String(err),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 grid gap-4 border-b border-muted pb-6"
      /* Top margin and bottom border to visually separate from table. Adjust `mb-6` as needed */
    >
      {/* Title Input */}
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short summary for the task (optional)"
          disabled={loading}
        />
      </div>
      {/* Description Input */}
      <div className="grid gap-2">
        <Label htmlFor="description">
          Description <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the task in detail"
          required
          minLength={5}
          disabled={loading}
          rows={3}
        />
      </div>
      {/* Controls: Toggle/Label/Tooltip/Button on same row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Switch
          id="syncWithGitHub"
          checked={syncWithGitHub}
          onCheckedChange={setSyncWithGitHub}
          disabled={loading}
        />
        <Label htmlFor="syncWithGitHub" className="flex items-center gap-1 select-none">
          Sync with GitHub
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <HelpCircle className="h-4 w-4 text-muted-foreground/70 cursor-help" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {syncWithGitHub
                  ? "Will be created as a GitHub issue"
                  : "Task will only be saved locally"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Button
          type="submit"
          disabled={loading}
          className="ml-auto"
        >
          {loading
            ? "Creating..."
            : syncWithGitHub
            ? "Create Task on GitHub"
            : "Create Task Locally"}
        </Button>
      </div>
    </form>
  )
}
