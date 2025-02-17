import Link from "next/link"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination"
import { AuthenticatedUserRepository } from "@/lib/types"

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
          <Link
            href={`/${username}/${repo.name}/issues`}
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
