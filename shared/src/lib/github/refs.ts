"use server"

import { getGraphQLClient } from "@/shared/lib/github"
import type { RepoFullName } from "@/shared/lib/types/github"

interface BranchByCommitDate {
  name: string
  committedDate: Date
}

type GraphQLResponse = {
  repository: {
    refs: {
      nodes: Array<{
        name: string
        target: { committedDate: Date }
      }>
      pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
      }
    }
  }
}

/**
 * Fetches branches for a given repository sorted by their latest commit date (descending).
 * Utilises GitHub's GraphQL API so that all required data can be retrieved in a single request.
 *
 * @param repoFullName The repository's full name in the format "owner/repo".
 * @param limit Optional max number of branches to return. Defaults to 20.
 * @returns A list of branches sorted by commit date (most recent first).
 */
export async function listBranchesSortedByCommitDate(
  repoFullName: RepoFullName,
  limit?: number // Optional: if provided, return only up to this many branches, else return all
): Promise<BranchByCommitDate[]> {
  const { owner, repo } = repoFullName

  const graphql = await getGraphQLClient()
  if (!graphql) {
    throw new Error("No authenticated GraphQL client available")
  }

  const query = `
    query ($owner: String!, $repo: String!, $pageSize: Int!, $after: String) {
      repository(owner: $owner, name: $repo) {
        refs(
          refPrefix: \"refs/heads/\",
          first: $pageSize,
          after: $after
        ) {
          nodes {
            name
            target {
              ... on Commit {
                committedDate
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `

  const allBranches: BranchByCommitDate[] = []
  let hasNextPage = true
  let after: string | null = null
  const pageSize = 100 // GitHub GraphQL max page size

  while (hasNextPage) {
    const response = await graphql<GraphQLResponse>(query, {
      owner,
      repo,
      pageSize,
      after,
    })

    const nodes = response.repository.refs.nodes
    for (const n of nodes) {
      if (n.target?.committedDate) {
        allBranches.push({
          name: n.name,
          committedDate: n.target.committedDate,
        })
      }
    }

    hasNextPage = response.repository.refs.pageInfo.hasNextPage
    after = response.repository.refs.pageInfo.endCursor

    if (limit && allBranches.length >= limit) {
      break
    }
  }

  // Ensure correct sorting just in case the API doesn't respect the order
  allBranches.sort(
    (a, b) =>
      new Date(b.committedDate).getTime() - new Date(a.committedDate).getTime()
  )

  if (limit) {
    return allBranches.slice(0, limit)
  }
  return allBranches
}
