"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { GitHubRepository } from "@/lib/types"

export function CreatePullRequestButton({
  issueNumber,
  repo,
}: {
  issueNumber: number
  repo: GitHubRepository
}) {
  const [isLoading, setIsLoading] = useState(false)

  const handleCreatePR = async () => {
    setIsLoading(true)
    try {
      console.log("Creating PR for issue", issueNumber, "in repo", repo)
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ issueNumber, repo }),
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
