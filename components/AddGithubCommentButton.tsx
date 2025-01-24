"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { GitHubRepository } from "@/lib/types"
import { getApiKeyFromLocalStorage } from "@/lib/utils"

export function AddGithubCommentButton({
  issueNumber,
  repo,
}: {
  issueNumber: number
  repo: GitHubRepository
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState("")

  // Load any existing API key from local storage
  useEffect(() => {
    const key = getApiKeyFromLocalStorage()
    if (key) {
      setApiKey(key)
    }
  }, [])

  const handleAddComment = async () => {
    if (!apiKey) {
      // Pull API key if recently saved
      const key = getApiKeyFromLocalStorage()
      if (!key) {
        toast({
          title: "API key not found",
          description: "Please save an OpenAI API key first.",
          variant: "destructive",
        })
        return
      }
      setApiKey(key)
    }

    setIsLoading(true)
    const response = await fetch("/api/comment", {
      method: "POST",
      body: JSON.stringify({ issueNumber, repo, apiKey }),
    })
    console.log(response)
    setIsLoading(false)
  }

  return (
    <Button onClick={handleAddComment} disabled={isLoading} variant="secondary">
      {isLoading ? "Adding comment..." : "Add Github comment"}
    </Button>
  )
}
