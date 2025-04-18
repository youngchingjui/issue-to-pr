"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { toast } from "@/lib/hooks/use-toast"
import { PostPlanRequest } from "@/lib/types/schemas"

interface PostToGitHubButtonProps {
  content: string
  issue: {
    number: number
    repoFullName: string
  }
}

export function PostToGitHubButton({
  content,
  issue,
}: PostToGitHubButtonProps) {
  const [isPosting, setIsPosting] = useState(false)

  const handlePostToGithub = async () => {
    try {
      setIsPosting(true)

      const requestBody: PostPlanRequest = {
        content,
        repoFullName: issue.repoFullName,
        issueNumber: issue.number,
      }

      const response = await fetch(`/api/issues/${issue.number}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(
          `Failed to post comment to GitHub: ${response.statusText}`
        )
      }

      const data = await response.json()

      toast({
        title: "Comment Posted",
        description: (
          <div>
            Your comment has been posted.{" "}
            <a
              href={data.commentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              View on GitHub
            </a>
          </div>
        ),
      })
    } catch (error) {
      console.error("Error posting comment:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to post comment to GitHub",
        variant: "destructive",
      })
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePostToGithub}
      disabled={isPosting}
    >
      {isPosting ? "Posting..." : "Post to GitHub"}
    </Button>
  )
}
