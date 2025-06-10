"use client"

import { HelpCircle } from "lucide-react"
import { useEffect, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { createIssue } from "@/lib/github/issues"
import { toast } from "@/lib/hooks/use-toast"
import { RepoFullName } from "@/lib/types/github"

type Task = {
  id: number
  title: string
  description: string
  createdAt: string
  synced: boolean
}

interface Props {
  repoFullName: RepoFullName
}

// Local storage key for toggle state per repo
const getSyncKey = (repo: string) => `syncWithGitHub:${repo}`
const getTasksKey = (repo: string) => `localTasks:${repo}`

export default function NewTaskInput({ repoFullName }: Props) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [syncWithGitHub, setSyncWithGitHub] = useState<boolean>(true)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Load/persist toggle state
  useEffect(() => {
    const syncPref = localStorage.getItem(getSyncKey(repoFullName.fullName))
    if (syncPref !== null) setSyncWithGitHub(syncPref === "true")
  }, [repoFullName])
  useEffect(() => {
    localStorage.setItem(
      getSyncKey(repoFullName.fullName),
      String(syncWithGitHub)
    )
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
        // --- Use Next.js server action instead of fetch ---
        startTransition(async () => {
          const res = await createIssue({
            repoFullName,
            title: taskTitle,
            body: description,
          })
          if (res.status === 201) {
            toast({
              title: "Task synced to GitHub",
              description: `Created: ${taskTitle}`,
              variant: "default",
            })
            setTitle("")
            setDescription("")
          } else {
            toast({
              title: "Error creating task",
              description: res.status || "Failed to create GitHub issue.",
              variant: "destructive",
            })
          }
          setLoading(false)
        })
      } else {
        // Local storage save
        const tasksKey = getTasksKey(repoFullName.fullName)
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
        setTitle("")
        setDescription("")
        setLoading(false)
      }
    } catch (err: unknown) {
      toast({
        title: "Error creating task",
        description: String(err),
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 grid gap-4 border-muted pb-6">
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading || isPending}
        />
      </div>
      <div className="grid gap-2">
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe a task"
          required
          minLength={5}
          disabled={loading || isPending}
          rows={3}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" disabled={loading || isPending}>
          {loading || isPending ? "Creating..." : "Create Github Issue"}
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <HelpCircle className="h-4 w-4 text-muted-foreground/70 cursor-help" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Creates an Issue on Github and starts resolving the task
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </form>
  )
}
