"use client"

import { useState } from "react"

import AnalyzePRButton from "@/components/AnalyzePRButton"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { PullRequestList } from "@/lib/types"
import { getApiKeyFromLocalStorage } from "@/lib/utils"

export function PullRequestRow({ pr }: { pr: PullRequestList[0] }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleReviewPullRequest = async (
    pullNumber: number,
    repoFullName: string
  ) => {
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

    setIsLoading(true)
    const response = await fetch("/api/review", {
      method: "POST",
      body: JSON.stringify({ pullNumber, repoFullName, apiKey: key }),
    })
    console.log(response)
    setIsLoading(false)
  }
  return (
    <div key={pr.id} className="flex py-2 px-4 border-b border-gray-300">
      <div className="shrink-0 text-gray-400 mr-2">{pr.number}</div>
      <div className="flex-1">{pr.title}</div>
      <div className="flex-1">{pr.state}</div>
      <div className="flex-1">
        <AnalyzePRButton
          repoFullName={pr.head.repo.full_name}
          pullNumber={pr.number}
        />
      </div>
      <div className="flex-1">
        <Button
          onClick={() =>
            handleReviewPullRequest(pr.number, pr.head.repo.full_name)
          }
          disabled={isLoading}
          variant="default"
        >
          {isLoading ? "Reviewing PR..." : "Review Pull Request"}
        </Button>
      </div>
    </div>
  )
}
