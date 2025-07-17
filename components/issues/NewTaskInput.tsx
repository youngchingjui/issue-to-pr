"use client"

import { HelpCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
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
  const [generatingTitle, setGeneratingTitle] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

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

    let taskTitle = title.trim()

    // Auto-generate title if none provided
    if (!taskTitle) {
      try {
        setGeneratingTitle(true)
        const res = await fetch("/api/playground/issue-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to generate title")
        taskTitle = (data.title as string).trim()
        if (!taskTitle) throw new Error("Received empty title from agent")
      } catch (err: unknown) {
        toast({
          title: "Error generating title",
          description: String(err),
          variant: "destructive",
        })
        setGeneratingTitle(false)
        return
      } finally {
        setGeneratingTitle(false)
      }
    }

    setLoading(true)
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
          // Refresh the data so the new issue appears in the list immediately
          router.refresh()
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

  const isSubmitting = loading || generatingTitle || isPending

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 grid gap-4 border-b border-muted pb-6"
    >
      <div className="grid gap-2">
        <Label htmlFor="title">Title (optional)</Label>
        <Input
          id="title"
          type="text"
          placeholder="Leave blank to auto-generate"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
        />
      </div>
      <div className="grid gap-2">
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe a task"
          required
          disabled={isSubmitting}
          rows={3}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" disabled={isSubmitting}>
          {generatingTitle ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating
              issue title...
            </>
          ) : loading || isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
            </>
          ) : (
            "Create Github Issue"
          )}
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

