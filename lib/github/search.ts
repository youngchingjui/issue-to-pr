import getOctokit from "@/lib/github"
import { SearchCodeItem } from "@/lib/types/github"

export async function searchCode({
  repoFullName,
  query,
}: {
  repoFullName: string
  query: string
}): Promise<SearchCodeItem[]> {
  const octokit = await getOctokit()
  if (!octokit) {
    throw new Error("No octokit found")
  }
  const response = await octokit.rest.search.code({
    q: `${query} repo:${repoFullName}`,
  })
  return response.data.items
}
