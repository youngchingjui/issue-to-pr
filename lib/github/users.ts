"use server"

import getOctokit from "@/lib/github"
import { getGraphQLClient } from "@/lib/github"
import {
  GitHubUser,
  RepoPermissions,
  RepoSelectorItem,
} from "@/lib/types/github"

export async function getGithubUser(): Promise<GitHubUser | null> {
  try {
    const octokit = await getOctokit()
    if (!octokit) {
      console.log("No Octokit instance found")
      return null
    }

    const { data: user } = await octokit.users.getAuthenticated()
    return user
  } catch (e) {
    console.error(e)
    return null
  }
}

interface GithubPermissions {
  admin?: boolean
  push?: boolean
  pull?: boolean
  maintain?: boolean
}

export async function checkRepoPermissions(
  repoFullName: string
): Promise<RepoPermissions> {
  try {
    const octokit = await getOctokit()
    if (!octokit) {
      return {
        canPush: false,
        canCreatePR: false,
        reason: "No GitHub authentication found",
      }
    }

    const [owner, repo] = repoFullName.split("/")

    // Get repository permissions for the authenticated user
    const { data: repoData } = await octokit.repos.get({
      owner,
      repo,
    })

    // Check if user has push access
    const permissions = (repoData.permissions || {}) as GithubPermissions
    const canPush = permissions.push || permissions.admin || false
    const canCreatePR = permissions.pull || permissions.admin || false

    if (!canPush && !canCreatePR) {
      return {
        canPush,
        canCreatePR,
        reason:
          "Insufficient permissions. User needs push access to create branches and pull request access to create PRs.",
      }
    }

    return {
      canPush,
      canCreatePR,
      reason:
        canPush && canCreatePR ? undefined : "Limited permissions available",
    }
  } catch (error) {
    console.error("Error checking repository permissions:", error)
    return {
      canPush: false,
      canCreatePR: false,
      reason: `Failed to check permissions: ${error}`,
    }
  }
}

interface UserRepositoriesGraphQLResponse {
  viewer: {
    repositories: {
      nodes: RepoSelectorItem[]
    }
  }
}

export async function listUserRepositoriesGraphQL(): Promise<
  RepoSelectorItem[]
> {
  const graphqlWithAuth = await getGraphQLClient()
  if (!graphqlWithAuth) {
    throw new Error("Could not initialize GraphQL client")
  }

  const query = `
    query {
      viewer {
        repositories(first: 50, orderBy: { field: UPDATED_AT, direction: DESC }) {
          nodes {
            name
            nameWithOwner
            description
            updatedAt
          }
        }
      }
    }
  `

  try {
    const response =
      await graphqlWithAuth<UserRepositoriesGraphQLResponse>(query)
    return response.viewer.repositories.nodes
  } catch (error) {
    console.error("Error fetching user repositories:", error)
    return []
  }
}
