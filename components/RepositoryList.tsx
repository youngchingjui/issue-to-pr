import Link from "next/link"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination"
import { AuthenticatedUserRepository } from "@/lib/types/github"

type RepositoryListProps = {
  repositories: AuthenticatedUserRepository[]
  currentPage: number
  maxPage: number
  username: string
}

export default async function RepositoryList({
  repositories,
  currentPage,
  maxPage,
  username,
}: RepositoryListProps) {
  const pages = Array.from({ length: maxPage }, (_, i) => i + 1)
  return (
    <ul className="space-y-4">
      {repositories.map((repo) => (
        <li key={repo.id} className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Link
              href={`/${repo.full_name}/issues`}
              className="text-blue-600 hover:underline font-medium"
            >
              {repo.name}
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link
                href={`/${repo.full_name}/issues`}
                className="text-stone-700 hover:underline"
              >
                Issues
              </Link>
              <span className="text-stone-300" aria-hidden="true">
                |
              </span>
              <Link
                href={`/${repo.full_name}/pullRequests`}
                className="text-stone-700 hover:underline"
              >
                Pull Requests
              </Link>
              <span className="text-stone-300" aria-hidden="true">
                |
              </span>
              <Link
                href={`/${repo.full_name}/settings`}
                className="text-stone-700 hover:underline"
              >
                Settings
              </Link>
            </div>
          </div>
        </li>
      ))}
      <Pagination>
        <PaginationContent>
          {pages.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                href={`/${username}?page=${page}`}
                isActive={page === currentPage}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
        </PaginationContent>
      </Pagination>
    </ul>
  )
}

