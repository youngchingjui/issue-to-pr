import { zodFunction } from "openai/helpers/zod"
import { z } from "zod"

import { searchCode } from "@/lib/github/search"
import { Tool } from "@/lib/types"

const searchCodeParameters = z.object({
  query: z.string().describe("The search query to use for searching code"),
})

class SearchCodeTool implements Tool<typeof searchCodeParameters> {
  repoFullName: string

  constructor(repoFullName: string) {
    this.repoFullName = repoFullName
  }

  parameters = searchCodeParameters
  tool = zodFunction({
    name: "search_code",
    parameters: searchCodeParameters,
    description: "Searches for code in a repository using a query",
  })

  async handler(params: z.infer<typeof searchCodeParameters>): Promise<string> {
    const { query } = params

    try {
      const searchCodeItems = await searchCode({
        repoFullName: this.repoFullName,
        query,
      })

      return JSON.stringify(searchCodeItems)
    } catch (error) {
      console.error("Error searching code:", error)
      throw error
    }
  }
}

export default SearchCodeTool
