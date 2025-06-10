"use client"

import { HelpCircle } from "lucide-react"
import { useState, useTransition } from "react"

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

interface Props {
  repoFullName: RepoFullName
}

export default function NewTaskInput({ repoFullName }: Props) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your task.",
        variant: "destructive",
      })
      return
    }
    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please enter a description for your task.",
        variant: "destructive",
      })
      return
    }
    setLoading(true)
    const taskTitle = title.trim()
    try {
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
              Creates an Issue on Github. If the Issue To PR Github App is
              installed, a Plan will automatically be generated for your Issue.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </form>
  )
}
