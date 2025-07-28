"use server"

import { z } from "zod"

import { getUserOctokit } from "@/lib/github"

/**
 * GraphQL document for listing the current viewer's repositories ordered by last update.
 * Keep the Zod schemas below in sync with this selection set whenever you edit it.
 */
const LIST_USER_REPOSITORIES_QUERY = `
  query ListUserRepositories {
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
` as const

const RepoSelectorItemSchema = z.object({
  name: z.string(),
  nameWithOwner: z.string(),
  description: z.string().nullable(),
  updatedAt: z.string(),
})
type RepoSelectorItem = z.infer<typeof RepoSelectorItemSchema>

const ResponseSchema = z.object({
  viewer: z.object({
    repositories: z.object({
      nodes: z.array(RepoSelectorItemSchema),
    }),
  }),
})

type ListUserRepositoriesResponse = z.infer<typeof ResponseSchema>

/**
 *
 * Lists repositories that are available to the user AND the Github App
 * We use `getUserOctokit` to retreive the list of repositories that are visible
 * to both the user AND the Github App.
 * This is different from `listUserAppRepositories` which only lists repositories
 * that have the Github App installed.
 * Therefore, public repositories will be included in this list, even if they
 * don't have the Github App installed. Since the Github App can also "see" public repositories.
 */
export async function listUserRepositories(): Promise<RepoSelectorItem[]> {
  const octokit = await getUserOctokit()
  const graphqlWithAuth = octokit.graphql

  if (!graphqlWithAuth) {
    throw new Error("Could not initialize GraphQL client")
  }

  const data = await graphqlWithAuth<ListUserRepositoriesResponse>(
    LIST_USER_REPOSITORIES_QUERY
  )

  const parsed = ResponseSchema.parse(data)

  return parsed.viewer.repositories.nodes.map((node) => ({
    nameWithOwner: node.nameWithOwner,
    name: node.name,
    description: node.description,
    updatedAt: node.updatedAt,
  }))
}
