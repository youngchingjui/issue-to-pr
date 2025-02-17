import { useEffect, useState } from "react"
import { getPullRequests } from "@/lib/github/pullRequests"
import ReviewPullRequestTool from "@/lib/tools/ReviewPullRequest"

interface PullRequest {
  id: number
  number: number
  title: string
  comments: number
  review_comments: number
  state: string
}

interface Props {
  username: string
  repoName: string
}

export default function PullRequestTable({ username, repoName }: Props) {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPullRequests() {
      try {
        const prs: PullRequest[] = await getPullRequests({ repo: repoName })
        setPullRequests(prs)
      } catch (err) {
        setError("Failed to load pull requests.")
      }
    }

    fetchPullRequests()
  }, [repoName])

  if (error) {
    return <p className="text-center py-4 text-red-500">{error}</p>
  }

  if (pullRequests.length === 0) {
    return <p className="text-center py-4">No open pull requests found.</p>
  }

  function handleReviewPullRequest(pullNumber: number) {
    // Trigger AI review logic
    const tool = new ReviewPullRequestTool({
      repo: { name: repoName, owner: username },
      issue: {}, // You might need to populate this according to your structure
      pullNumber,
      baseDir: "./", // Base directory if needed
      apiKey: "your-api-key", // Replace with actual mechanism to retrieve API key
    })

    tool.handler().then(result => {
      console.log("Review result:", result)
    }).catch(err => {
      console.error("Review error:", err)
    })
  }

  return (
    <div className="bg-white border border-gray-300">
      <div className="flex bg-gray-100 py-2 px-4">
        <div className="flex-1 font-bold">PR #</div>
        <div className="flex-1 font-bold">PR Name</div>
        <div className="flex-1 font-bold">Comments</div>
        <div className="flex-1 font-bold">Review Status</div>
        <div className="flex-1 font-bold">Actions</div>
      </div>
      <div>
        {pullRequests.map(pr => (
          <div key={pr.id} className="flex py-2 px-4 border-b border-gray-300">
            <div className="flex-1">{pr.number}</div>
            <div className="flex-1">{pr.title}</div>
            <div className="flex-1">{pr.comments + pr.review_comments}</div>
            <div className="flex-1">{pr.state}</div>
            <div className="flex-1">
              <button
                className="bg-blue-500 text-white px-2 py-1 rounded"
                onClick={() => handleReviewPullRequest(pr.number)}
              >
                Let AI review your PR
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
