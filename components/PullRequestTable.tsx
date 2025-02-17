"use client"

import { Button } from "@/components/ui/button"
import { PullRequest } from "@/lib/types"

export default function PullRequestTable({
  pullRequests,
}: {
  pullRequests: PullRequest[]
}) {
  function handleReviewPullRequest(pullNumber: number) {
    // Trigger AI review logic
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
              <Button onClick={() => handleReviewPullRequest(pr.number)}>
                Let AI review your PR
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
