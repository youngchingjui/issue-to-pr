import { components } from "@octokit/openapi-types"
import Link from "next/link"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "./ui/pagination"

// Define types for additional API data fetch
interface LatestCommit {
  date: string
}

interface EnhancedRepository extends GitHubRepository {
  latestCommitDate: string
}

// Helper function to fetch the latest commit date for a repository (assuming a function exists)
async function fetchLatestCommitDate(repo: GitHubRepository): Promise<string> {
  const commitUrl = repo.commits_url.replace('{/sha}', '/HEAD');
  const response = await fetch(commitUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch latest commit data");
  }
  const data: { commit: { author: { date: string } } } = await response.json();
  return data.commit.author.date;
}

// Helper function to enhance repositories with latest commit dates
async function enhanceRepositories(repositories: GitHubRepository[]): Promise<EnhancedRepository[]> {
  const enhancedRepos = await Promise.all(
    repositories.map(async (repo) => {
      const latestCommitDate = await fetchLatestCommitDate(repo);
      return { ...repo, latestCommitDate };
    })
  );
  return enhancedRepos.sort((a, b) => new Date(b.latestCommitDate).getTime() - new Date(a.latestCommitDate).getTime());
}

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
  // Enhance repositories with the latest commit date and sort them
  const enhancedRepositories = await enhanceRepositories(repositories);

  const pages = Array.from({ length: maxPage }, (_, i) => i + 1);
  return (
    <ul className="space-y-4">
      {enhancedRepositories.map((repo) => (
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
  );
}
