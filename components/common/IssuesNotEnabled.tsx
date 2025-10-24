import { getRepoFromString } from "@/lib/github/content"
import { RepoFullName } from "@/lib/types/github"

export default async function IssuesNotEnabled({
  repoFullName,
}: {
  repoFullName: RepoFullName
}) {
  const repo = await getRepoFromString(repoFullName.fullName)
  const issuesEnabled = !!repo.has_issues
  if (issuesEnabled) {
    return null
  }
  return (
    <div className="mb-6 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
      <p className="mb-1 font-medium">
        GitHub Issues are disabled for this repository.
      </p>
      <p>
        We require Github Issues in order to create tasks and run agent
        workflows off of them. To enable issues, turn on the Issues feature in
        the{" "}
        <a
          href={`https://github.com/${repoFullName.owner}/${repoFullName.repo}/settings#features`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Github repository settings
        </a>{" "}
        page.
      </p>
    </div>
  )
}
