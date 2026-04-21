"use server"

import { getGraphQLClient } from "@/lib/github"

interface BranchNode {
  name: string
  target: {
    __typename: string
    committedDate?: string // only for Commit targets
    // other fields are ignored
  }
}

interface BranchQueryResponse {
  repository: {
    refs: {
      nodes: BranchNode[]
    }
  }
}

/**
 * Fetches branches for the given repository sorted by the date of their latest commit (DESC).
 * Uses the GitHub GraphQL API so that branch metadata is fetched in **one** request.
 *
 * @param repoFullName  Repository in the form `owner/repo` (e.g. "vercel/next.js")
 * @param limit         Optional number limiting how many branches to return (default 50)
 *
 * @returns An array of branch names sorted from newest commit ➡ oldest commit
 */
export async function listBranchesSortedByCommitDate(
  repoFullName: string,
  limit = 50
): Promise<string[]> {
  const graphqlWithAuth = await getGraphQLClient()
  if (!graphqlWithAuth) {
    throw new Error("Could not initialize GraphQL client")
  }

  const [owner, name] = repoFullName.split("/")
  if (!owner || !name) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }

  // The GitHub GraphQL API allows ordering refs, but not by commit date for branches.
  // We'll fetch the first `limit` branches (ordered alphabetically) then sort client-side
  // by the commit date of the branch head.

  const query = `
    query ListBranches($owner: String!, $name: String!, $first: Int!) {
      repository(owner: $owner, name: $name) {
        refs(first: $first, refPrefix: "refs/heads/") {
          nodes {
            name
            target {
              __typename
              ... on Commit {
                committedDate
              }
            }
          }
        }
      }
    }
  `

  let response: BranchQueryResponse
  try {
    response = await graphqlWithAuth<BranchQueryResponse>(query, {
      owner,
      name,
      first: limit,
    })
  } catch (error) {
    console.error("Error fetching branches via GraphQL:", error)
    return []
  }

  const branches = response.repository.refs.nodes

  // Sort by commit date descending (newest first). Fallback to 0 timestamp if missing
  branches.sort((a, b) => {
    const dateA = a.target && a.target.__typename === "Commit" && a.target.committedDate ? Date.parse(a.target.committedDate) : 0
    const dateB = b.target && b.target.__typename === "Commit" && b.target.committedDate ? Date.parse(b.target.committedDate) : 0
    return dateB - dateA
  })

  return branches.map((b) => b.name)
}

