"use client"

import { Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getGithubUser } from "@/lib/github/users"
import { toast } from "@/lib/hooks/use-toast"
import { createTask } from "@/lib/neo4j/services/task"
import { IssueTitleResponseSchema } from "@/lib/types/api/schemas"
import { RepoFullName } from "@/lib/types/github"

interface Props {
  repoFullName: RepoFullName
}

export default function NewLocalTaskInput({ repoFullName }: Props) {
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [generatingTitle, setGeneratingTitle] = useState(false)

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
    let taskTitle = ""
    try {
      setGeneratingTitle(true)
      const res = await fetch("/api/playground/issue-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      })
      const data = await res.json()
      const parsedData = IssueTitleResponseSchema.safeParse(data)
      if (!parsedData.success) {
        throw new Error(parsedData.error.message)
      }
      taskTitle = parsedData.data.title.trim()
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
    setLoading(true)
    try {
      const user = await getGithubUser()
      if (!user) {
        throw new Error("User not found")
      }
      await createTask({
        repoFullName,
        title: taskTitle,
        body: description,
        createdBy: user.login,
      })
      toast({
        title: "Task created",
        description: `Created: ${taskTitle}`,
        variant: "default",
      })
      setDescription("")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast({
        title: "Error creating task",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const isSubmitting = loading || generatingTitle

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 grid gap-4 border-b border-muted pb-6"
    >
      <div className="grid gap-2">
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe a local task..."
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
              title...
            </>
          ) : loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
            </>
          ) : (
            "Create Local Task"
          )}
        </Button>
      </div>
    </form>
  )
}
