import { getGraphQLClient } from "@/lib/github"

export interface BranchByCommitDate {
  name: string
  committedDate: string
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
  repoFullName: string,
  limit = 20
): Promise<BranchByCommitDate[]> {
  const [owner, repo] = repoFullName.split("/")
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'")
  }

  const graphql = await getGraphQLClient()
  if (!graphql) {
    throw new Error("No authenticated GraphQL client available")
  }

  /*
    We leverage the `refs` connection with the `TAG_COMMIT_DATE` field for ordering.
    Although the documentation labels this field for tags, GitHub applies the same
    ordering logic (by target commit date) for branch refs as well.
    In the unlikely event the API doesn't honour the ordering we still perform a
    client-side sort as a safety net.
  */
  const query = `
    query ($owner: String!, $repo: String!, $limit: Int!) {
      repository(owner: $owner, name: $repo) {
        refs(refPrefix: "refs/heads/", first: $limit, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
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

  type GraphQLResponse = {
    repository: {
      refs: {
        nodes: Array<{
          name: string
          target: { committedDate: string | null }
        }>
      }
    }
  }

  const response = (await graphql<GraphQLResponse>(query, {
    owner,
    repo,
    limit,
  })) as GraphQLResponse

  const branches: BranchByCommitDate[] = response.repository.refs.nodes
    .filter((n) => n.target?.committedDate)
    .map((n) => ({ name: n.name, committedDate: n.target.committedDate as string }))

  // Ensure correct sorting just in case the API doesn't respect the order
  branches.sort(
    (a, b) => new Date(b.committedDate).getTime() - new Date(a.committedDate).getTime()
  )

  return branches
}

