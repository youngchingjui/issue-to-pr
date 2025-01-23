"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { GitHubRepository } from "@/lib/types"

export function AddGithubCommentButton({
  issueNumber,
  repo,
}: {
  issueNumber: number
  repo: GitHubRepository
}) {
  const [isLoading, setIsLoading] = useState(false)

  const handleAddComment = async () => {
    setIsLoading(true)
    const response = await fetch("/api/comment", {
      method: "POST",
      body: JSON.stringify({ issueNumber, repo }),
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
