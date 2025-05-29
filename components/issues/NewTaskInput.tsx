"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
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
    <Card className="mb-6">
      <CardHeader className="pb-0">
        <CardTitle>New Task</CardTitle>
        <CardDescription>Add a new task to {repoFullName}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">
              Title <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary for the task (optional)"
              disabled={loading}
            />
          </div>
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
          <div className="flex items-center gap-2">
            <Switch
              id="syncWithGitHub"
              checked={syncWithGitHub}
              onCheckedChange={setSyncWithGitHub}
              disabled={loading}
            />
            <Label htmlFor="syncWithGitHub">
              Sync with GitHub
              <span className="ml-2 text-muted-foreground text-xs">
                (
                {syncWithGitHub
                  ? "Will be created as GitHub issue"
                  : "Saved locally only"}
                )
              </span>
            </Label>
          </div>
          <Button type="submit" disabled={loading}>
            {loading
              ? "Creating..."
              : syncWithGitHub
                ? "Create Task on GitHub"
                : "Create Task Locally"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
