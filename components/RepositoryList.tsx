import Link from "next/link"

type Repository = {
  id: number
  name: string
  full_name: string
}

type RepositoryListProps = {
  repositories: Repository[]
}

export default function RepositoryList({ repositories }: RepositoryListProps) {
  return (
    <ul className="space-y-4">
      {repositories.map((repo) => (
        <li key={repo.id} className="bg-white shadow rounded-lg p-4">
          <Link
            href={`/repository/${repo.full_name}`}
            className="text-blue-600 hover:underline"
          >
            {repo.name}
          </Link>
        </li>
      ))}
    </ul>
  )
}
