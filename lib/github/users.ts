"use server"

import { getUserOctokit } from "@/lib/github"
import { listUserAppRepositories } from "@/lib/github/repos"
import {
  GitHubUser,
  RepoPermissions,
  RepoSelectorItem,
} from "@/lib/types/github"

export async function getGithubUser(): Promise<GitHubUser | null> {
  try {
    const octokit = await getUserOctokit()
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

export async function checkRepoPermissions(
  repoFullName: string
): Promise<RepoPermissions> {
  try {
    const repos = await listUserAppRepositories()

    let canPush = false
    let canCreatePR = false

    // Find the repository matching the provided full name ("owner/repo")
    const repoData = repos.find((r) => r.full_name === repoFullName)

    if (!repoData) {
      throw new Error(`Repository not found or not accessible: ${repoFullName}`)
    }

    const { permissions } = repoData

    if (!permissions) {
      throw new Error(`There were no permissions, strange: ${permissions}`)
    }

    canPush = permissions.push || permissions.admin || false
    canCreatePR = permissions.pull || permissions.admin || false

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
    if (error && typeof error === "object" && "status" in error) {
      if (error.status === 404) {
        throw new Error("Repository not found: " + repoFullName)
      }
    }
    console.error("Error checking repository permissions:", error)
    throw new Error(
      `Failed to check permissions: ${error instanceof Error ? error.message : String(error)}`
    )
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
  const octokit = await getUserOctokit()
  const graphqlWithAuth = octokit.graphql
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
