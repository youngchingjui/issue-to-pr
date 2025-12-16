import { GitHubAuthProvider, GitHubAuthTarget } from "@shared/ports/github/auth"

/**
 * Updates a pull request body using GitHub's GraphQL API.
 */
export async function updatePullRequestBody(
  params: {
    owner: string
    repo: string
    pullNumber: number
    body: string
  },
  auth: {
    authProvider: GitHubAuthProvider
    authTarget: GitHubAuthTarget
  }
): Promise<
  | { status: "success"; pullRequestId: string }
  | { status: "error"; message: string }
> {
  const { owner, repo, pullNumber, body } = params
  const { authProvider, authTarget } = auth
  try {
    const { graphql } = await authProvider.getClient(authTarget)

    // Get the PR node ID
    const query = /* GraphQL */ `
      query GetPullRequestId(
        $owner: String!
        $repo: String!
        $pullNumber: Int!
      ) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $pullNumber) {
            id
          }
        }
      }
    `

    const mutation = /* GraphQL */ `
      mutation UpdatePullRequestBody($pullRequestId: ID!, $body: String!) {
        updatePullRequest(
          input: { pullRequestId: $pullRequestId, body: $body }
        ) {
          pullRequest {
            id
          }
        }
      }
    `

    const queryResult = await graphql<{
      repository: { pullRequest: { id: string } | null } | null
    }>(query, { owner, repo, pullNumber })

    const pullRequestId = queryResult.repository?.pullRequest?.id
    if (!pullRequestId) {
      return {
        status: "error",
        message: `Pull request not found for ${owner}/${repo}#${pullNumber}`,
      }
    }

    const mutationResult = await graphql<{
      updatePullRequest: { pullRequest: { id: string } | null }
    }>(mutation, { pullRequestId, body })

    const updatedId = mutationResult.updatePullRequest?.pullRequest?.id
    if (!updatedId) {
      return {
        status: "error",
        message: `Failed to update pull request body for id ${pullRequestId}`,
      }
    }

    return { status: "success", pullRequestId: updatedId }
  } catch (err: unknown) {
    return {
      status: "error",
      message:
        err instanceof Error
          ? err.message
          : (typeof err === "string" && err) || "Unknown error occurred",
    }
  }
}
