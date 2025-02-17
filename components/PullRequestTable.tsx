"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { PullRequest } from "@/lib/types"
import { getApiKeyFromLocalStorage } from "@/lib/utils"

export default function PullRequestTable({
  pullRequests,
}: {
  pullRequests: PullRequest[]
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

  const handleReviewPullRequest = async (
    pullNumber: number,
    repoFullName: string
  ) => {
    let key = apiKey
    if (!key) {
      // Pull API key if recently saved
      key = getApiKeyFromLocalStorage()
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
    const response = await fetch("/api/review", {
      method: "POST",
      body: JSON.stringify({ pullNumber, repoFullName, apiKey: key }),
    })
    console.log(response)
    setIsLoading(false)
  }

  return (
    <div className="bg-white border border-gray-300">
      <div className="flex bg-gray-100 py-2 px-4">
        <div className="flex-1 font-bold"></div>
        <div className="flex-1 font-bold">PR Name</div>
        <div className="flex-1 font-bold">Status</div>
        <div className="flex-1 font-bold">Actions</div>
      </div>
      <div>
        {pullRequests.map((pr) => (
          <div key={pr.id} className="flex py-2 px-4 border-b border-gray-300">
            <div className="shrink-0 text-gray-400 mr-2">{pr.number}</div>
            <div className="flex-1">{pr.title}</div>
            <div className="flex-1">{pr.state}</div>
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
        ))}
      </div>
    </div>
  )
}
