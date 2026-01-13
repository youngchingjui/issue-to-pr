import OpenAI from "openai"
import { z } from "zod"

import { createTool } from "@/shared/lib/tools/helper"
import { type Tool } from "@/shared/lib/types"

const name = "web_search"
const description = `Searches the web for relevant information and returns a concise summary with source URLs. Use this when you need information outside the local codebase.`

export const webSearchParameters = z.object({
  query: z
    .string()
    .min(1, "Query cannot be empty.")
    .describe("The web search query to run."),
  contextSize: z
    .enum(["low", "medium", "high"])
    .default("medium")
    .describe("How much context to pull from search results."),
  allowedDomains: z
    .array(z.string())
    .optional()
    .describe("Optional list of domains to restrict the search to."),
})

export type WebSearchParameters = z.infer<typeof webSearchParameters>

type WebSearchResult = {
  status: "success" | "error"
  query: string
  summary?: string
  sources?: string[]
  message?: string
}

// TODO: You know, honestly this approach seems to be fine. As long as it works.
// I was expecting more of an integrated, simpler approach to implement this tool.
// Instead of calling yet another OpenAI Creation API endpoint within the tool itself.
// I thought OpenAI SDK allows integrated embedding of the websearch tool.
export const createWebSearchTool = ({
  apiKey,
  model = "gpt-4o-mini",
}: {
  apiKey: string
  model?: string
}): Tool<typeof webSearchParameters, WebSearchResult> =>
  createTool({
    name,
    description,
    schema: webSearchParameters,
    handler: async ({
      query,
      contextSize,
      allowedDomains,
    }: WebSearchParameters) => {
      const openai = new OpenAI({ apiKey })
      try {
        const response = await openai.responses.create({
          model,
          tools: [
            {
              type: "web_search",
              search_context_size: contextSize,
              filters:
                allowedDomains && allowedDomains.length > 0
                  ? { allowed_domains: allowedDomains }
                  : undefined,
            },
          ],
          tool_choice: { type: "web_search" },
          include: ["web_search_call.action.sources"],
          input: `Search the web for: ${query}. Provide a concise summary with key points and cite sources.`,
        })

        if (response.error) {
          return {
            status: "error",
            query,
            message: response.error.message ?? "Unknown web search error.",
          }
        }

        const sources = new Set<string>()
        for (const item of response.output ?? []) {
          if (item.type === "web_search_call") {
            const action = (item as {
              action?: { sources?: Array<{ url?: string | null }> }
            }).action
            if (action?.sources) {
              for (const source of action.sources) {
                if (source?.url) {
                  sources.add(source.url)
                }
              }
            }
          }
        }

        return {
          status: "success",
          query,
          summary: response.output_text?.trim() ?? "",
          sources: Array.from(sources),
        }
      } catch (error) {
        return {
          status: "error",
          query,
          message: String(error),
        }
      }
    },
  })
