import { IssueActionsDropdown } from "@/components/IssueActionsDropdown"
import { getRepoFromString, getRepositoryIssues } from "@/lib/github-old"

interface Props {
  username: string
  repoName: string
}

export default async function IssueTable({ username, repoName }: Props) {
  try {
    const issues = await getRepositoryIssues(username, repoName)
    const repo = await getRepoFromString(username, repoName)

    if (issues.length === 0) {
      return <p className="text-center py-4">No open issues found.</p>
    }

    return (
      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border-b">Issue</th>
            <th className="py-2 px-4 border-b">Status</th>
            <th className="py-2 px-4 border-b">Associated Branch</th>
            <th className="py-2 px-4 border-b">Pull Request</th>
            <th className="py-2 px-4 border-b">Actions</th>
            <th className="py-2 px-4 border-b">More</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.id} className="border-b">
              <td className="py-2 px-4">{issue.title}</td>
              <td className="py-2 px-4">{issue.state}</td>
              {/* <td className="py-2 px-4">{issue.associatedBranch || "N/A"}</td> */}
              {/* <td className="py-2 px-4">
                {issue.pullRequest ? (
                  <a
                    href={issue.pullRequest.url}
                    className="text-blue-500 hover:underline"
                  >
                    #{issue.pullRequest.number}
                  </a>
                ) : (
                  "No PR"
                )}
              </td> */}
              {/* <td className="py-2 px-4">
                {!issue.pullRequest && (
                  <CreatePullRequestButton issueNumber={issue.number} />
                )}
              </td> */}
              <td className="py-2 px-4">
                <IssueActionsDropdown issueNumber={issue.number} repo={repo} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  } catch (error) {
    return (
      <p className="text-center py-4 text-red-500">
        Error: {(error as Error).message}
      </p>
    )
  }
}
