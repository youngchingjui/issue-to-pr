"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { GitHubRepository } from "@/lib/types"
import { getApiKeyFromLocalStorage } from "@/lib/utils"
export function CreatePullRequestButton({
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

  const handleCreatePR = async () => {
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
    try {
      console.log("Creating PR for issue", issueNumber, "in repo", repo)
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ issueNumber, repo, apiKey }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong")
      }

      // Refresh the page or update the UI as needed
      window.location.reload()
    } catch (error) {
      console.error("Failed to create pull request:", error)
      alert(error.error || error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleCreatePR} disabled={isLoading}>
      {isLoading ? "Creating PR..." : "Fix Issue & Create PR"}
    </Button>
  )
}
