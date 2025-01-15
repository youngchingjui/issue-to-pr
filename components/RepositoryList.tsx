import { components } from "@octokit/openapi-types"
import Link from "next/link"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination"

type GitHubRepository = components["schemas"]["full-repository"]

type RepositoryListProps = {
  repositories: GitHubRepository[]
  currentPage: number
  maxPage: number
}

export default async function RepositoryList({
  repositories,
  currentPage,
  maxPage,
}: RepositoryListProps) {
  const pages = Array.from({ length: maxPage }, (_, i) => i + 1)
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
      <Pagination>
        <PaginationContent>
          {pages.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                href={`/?page=${page}`}
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
