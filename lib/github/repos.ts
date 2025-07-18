"use server"

import getOctokit from "@/lib/github"
import { RepoFullName } from "@/lib/types/github"

export interface BranchInfo {
  name: string
  commitDate?: string // ISO string
}

/**
 * Fetch up to `perPage` branches and return name array.
 */
export async function listBranches(
  repoFullName: string,
  perPage = 100
): Promise<string[]> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit instance available")
  }
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }
  const { data } = await octokit.rest.repos.listBranches({
    owner,
    repo,
    per_page: perPage,
  })
  return data.map((b) => b.name)
}

/**
 * Fetch the default branch of a repository.
 */
export async function getDefaultBranch(
  repoFullName: RepoFullName
): Promise<string> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit instance available")
  }

  const { owner, repo } = repoFullName
  const { data } = await octokit.rest.repos.get({
    owner,
    repo,
  })
  return data.default_branch
}

/**
 * Fetch branch info (name + latest commit date) for the first `limit` branches.
 * Returns the array sorted by latest commit date (desc).
 */
export async function listBranchInfo(
  repoFullName: string,
  limit = 100
): Promise<BranchInfo[]> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit instance available")
  }

  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }

  // GitHub GraphQL can return at most 100 refs per request
  const perPage = Math.min(limit, 100)

  const query = `
    query ListBranches($owner: String!, $name: String!, $perPage: Int!) {
      repository(owner: $owner, name: $name) {
        refs(
          refPrefix: "refs/heads/"
          first: $perPage
          orderBy: { field: TAG_COMMIT_DATE, direction: DESC }
        ) {
          nodes {
            name
            target {
              ... on Commit {
                committedDate
              }
            }
          }
        }
      }
    }
  `

  type queryResult = {
    repository: {
      refs: {
        nodes: {
          name: string
          target: { committedDate?: string } | null
        }[]
      }
    }
  }

  const result = await octokit.graphql<queryResult>(query, {
    owner,
    name: repo,
    perPage,
  })

  const branchInfos: BranchInfo[] = result.repository.refs.nodes.map(
    (node) => ({
      name: node.name,
      commitDate: (node.target as { committedDate?: string } | null)
        ?.committedDate,
    })
  )

  // Slice in case the caller requested fewer than we fetched
  return branchInfos.slice(0, limit)
}
