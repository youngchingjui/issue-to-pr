"use client"

import { useState } from "react"
import { Button } from "./ui/button"

export function CreatePullRequestButton({
  issueNumber,
}: {
  issueNumber: number
}) {
  const [isLoading, setIsLoading] = useState(false)

  const handleCreatePR = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ issueNumber }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong")
      }

      // Refresh the page or update the UI as needed
      window.location.reload()
    } catch (error) {
      console.error("Failed to create pull request:", error)
      alert("Failed to create pull request. Please try again.")
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
