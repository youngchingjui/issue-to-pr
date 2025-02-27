import getOctokit from "@/lib/github"
import { SearchCodeItem } from "@/lib/types"

export async function searchCode({
  repoFullName,
  query,
}: {
  repoFullName: string
  query: string
}): Promise<Partial<SearchCodeItem>[]> {
  const octokit = await getOctokit()
  const response = await octokit.rest.search.code({
    q: `${query} repo:${repoFullName}`,
  })
  
  // Filter the result items to include only the specified fields
  const filteredItems = response.data.items.map(item => ({
    name: item.name,
    path: item.path,
    sha: item.sha,
    description: item.description,
    repository: {
      full_name: item.repository.full_name,
    },
  }))

  return filteredItems
}
