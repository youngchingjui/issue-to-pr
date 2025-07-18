import getOctokit, { getGraphQLClient } from "@/lib/github"

// Helper type for branch information returned by the GraphQL query
interface BranchNode {
  name: string
  target: {
    committedDate?: string // present when the target is a Commit
  }
}

/**
 * Fetch a repository's branches using the GitHub GraphQL API and return them
 * sorted by the latest commit date (descending).
 *
 * Compared to the REST version (which would require an additional request per
 * branch to obtain the last commit), this approach retrieves all the
 * information in a single network round-trip.
 *
 * @param repoFullName A string in the form "owner/repo".
 * @param limit Optional maximum number of branches to return. Defaults to 100 –
 *              the maximum number that can be fetched in a single GraphQL
 *              page.  Note that the GitHub API currently caps `first` at 100.
 * @returns An array of branch names ordered by most recent commit first.
 */
export async function listBranches(
  repoFullName: string,
  limit = 100
): Promise<string[]> {
  // Split and validate the repo identifier
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }

  // Prefer GraphQL for efficiency – fall back to REST if GraphQL auth is
  // unavailable (e.g. when the caller is not authenticated).
  const graphqlWithAuth = await getGraphQLClient()
  if (!graphqlWithAuth) {
    // eslint-disable-next-line @typescript-eslint/return-await
    return legacyListBranchesRest(repoFullName)
  }

  // GraphQL query to fetch branch names + last commit date in a single call
  const query = `
    query($owner: String!, $repo: String!, $first: Int!) {
      repository(owner: $owner, name: $repo) {
        refs(refPrefix: \"refs/heads/\", first: $first) {
          nodes {
            name
            target {
              ... on Commit {\n                committedDate\n              }
            }
          }
        }
      }
    }
  `

  const variables = { owner, repo, first: Math.min(limit, 100) }

  type BranchesResponse = {
    repository: {
      refs: {
        nodes: BranchNode[]
      }
    }
  }

  try {
    const resp = await graphqlWithAuth<BranchesResponse>(query, variables)
    const nodes = resp.repository.refs.nodes

    // Sort nodes by committedDate descending; undefined dates go last
    const sorted = nodes.sort((a, b) => {
      const dateA = a.target.committedDate ? new Date(a.target.committedDate) : null
      const dateB = b.target.committedDate ? new Date(b.target.committedDate) : null
      if (dateA && dateB) return dateB.getTime() - dateA.getTime()
      if (dateA) return -1
      if (dateB) return 1
      return 0
    })

    const names = sorted.map((n) => n.name)
    return names.slice(0, limit)
  } catch (err) {
    console.error("GraphQL branch query failed, falling back to REST:", err)
    // eslint-disable-next-line @typescript-eslint/return-await
    return legacyListBranchesRest(repoFullName)
  }
}

// ------------------------------
// Legacy REST implementation
// ------------------------------

/**
 * Previous REST helper kept as a fallback when GraphQL authentication is not
 * available or the GraphQL request fails for any reason.
 */
async function legacyListBranchesRest(repoFullName: string): Promise<string[]> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No Octokit instance available")
  }
  const [owner, repo] = repoFullName.split("/")
  const { data } = await octokit.rest.repos.listBranches({
    owner,
    repo,
    per_page: 100,
  })
  return data.map((b) => b.name)
}

