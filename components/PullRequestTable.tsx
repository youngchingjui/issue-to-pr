import { PullRequestRow } from "@/components/PullRequestRow"
import { PullRequest } from "@/lib/types"

export default function PullRequestTable({
  pullRequests,
}: {
  pullRequests: PullRequest[]
}) {
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
          <PullRequestRow key={pr.id} pr={pr} />
        ))}
      </div>
    </div>
  )
}
