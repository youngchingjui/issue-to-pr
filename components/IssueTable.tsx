import { AddGithubCommentButton } from "@/components/AddGithubCommentButton"
import { IssueActionsDropdown } from "@/components/IssueActionsDropdown"
import { getRepoFromString } from "@/lib/github/content"
import { getRepositoryIssues } from "@/lib/github-old"

interface Props {
  username: string
  repoName: string
}

export default async function IssueTable({ username, repoName }: Props) {
  try {
    const issues = await getRepositoryIssues(username, repoName)
    const repo = await getRepoFromString(repoName)

    if (issues.length === 0) {
      return <p className="text-center py-4">No open issues found.</p>
    }

    return (
      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border-b">Issue</th>
            <th className="py-2 px-4 border-b">Status</th>
            <th className="py-2 px-4 border-b">Comment</th>
            <th className="py-2 px-4 border-b">Actions</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.id} className="border-b">
              <td className="py-2 px-4">{issue.title}</td>
              <td className="py-2 px-4">{issue.state}</td>
              <td className="py-2 px-4">
                <AddGithubCommentButton
                  issueNumber={issue.number}
                  repo={repo}
                />
              </td>
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
