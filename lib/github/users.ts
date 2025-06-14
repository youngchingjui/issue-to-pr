"use server"

import getOctokit, { ExtendedOctokit } from "@/lib/github"
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
): Promise<RepoPermissions & { isCollaborator: boolean }> {
  try {
    const octokit = (await getOctokit()) as ExtendedOctokit | null
    if (!octokit) {
      return {
        canPush: false,
        canCreatePR: false,
        reason: "No GitHub authentication found",
        isCollaborator: false,
      }
    }

    let canPush = false
    let canCreatePR = false
    let isCollaborator = false

    if (octokit.authType === "user") {
      // OAuth user: rely on repository.permissions
      const [owner, repo] = repoFullName.split("/")

      const { data: repoData } = await octokit.rest.repos.get({
        owner,
        repo,
      })

      const repoPerms = (repoData.permissions || {}) as GithubPermissions
      canPush = repoPerms.push || repoPerms.admin || false
      canCreatePR = repoPerms.pull || repoPerms.admin || false

      // Additional check for collaborator
      const { status } = await octokit.rest.repos.checkCollaborator({
        owner,
        repo,
        username: repoData.owner.login,
      })
      isCollaborator = status === 204
    } else {
      // GitHub App: rely on fine-grained installation permissions
      const installationPerms = octokit.installationPermissions

      const contentsPerm = installationPerms?.contents || "none"
      const prPerm = installationPerms?.pull_requests || "none"

      canPush = contentsPerm === "write" || contentsPerm === "admin"
      canCreatePR = prPerm === "write" || prPerm === "admin" || canPush === true

      // App installs should always have some level of access, treat as collaborator
      isCollaborator = canPush || canCreatePR
    }

    if (!canPush && !canCreatePR) {
      return {
        canPush,
        canCreatePR,
        reason:
          "Insufficient permissions. User needs push access to create branches and pull request access to create PRs.",
        isCollaborator: false,
      }
    }

    return {
      canPush,
      canCreatePR,
      reason:
        canPush && canCreatePR ? undefined : "Limited permissions available",
      isCollaborator,
    }
  } catch (error) {
    console.error("Error checking repository permissions:", error)
    return {
      canPush: false,
      canCreatePR: false,
      reason: `Failed to check permissions: ${error}`,
      isCollaborator: false,
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
