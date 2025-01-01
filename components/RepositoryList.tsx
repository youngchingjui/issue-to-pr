import { components } from "@octokit/openapi-types"
import Link from "next/link"

type GitHubRepository = components["schemas"]["full-repository"]

type RepositoryListProps = {
  repositories: GitHubRepository[]
}

export default async function RepositoryList({
  repositories,
}: RepositoryListProps) {
  return (
    <ul className="space-y-4">
      {repositories.map((repo) => (
        <li key={repo.id} className="bg-white shadow rounded-lg p-4">
          <Link
            href={`/${repo.owner.login}/${repo.name}`}
            className="text-blue-600 hover:underline"
          >
            {repo.name}
          </Link>
        </li>
      ))}
    </ul>
  )
}
