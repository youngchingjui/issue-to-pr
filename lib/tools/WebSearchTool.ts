import { z } from "zod"

import { openai } from "@/lib/openai"
import { createTool } from "@/lib/tools/helper"

/*
 * WebSearchTool
 * --------------
 * Exposes OpenAI's native `web_search` capability to our in-house agents.
 *
 * The tool accepts a natural-language `query` string and returns a short
 * textual answer produced by an OpenAI model with access to the public web.
 *
 * Implementation details:
 * • We delegate the heavy-lifting to OpenAI by invoking a chat completion
 *   with the special `web_search` tool enabled. The OpenAI platform handles
 *   the actual browsing behind the scenes and replies with an answer that
 *   we forward back to the calling agent.
 * • We purposefully keep the interface minimal (just `query`) because the
 *   server currently ignores additional parameters such as result-count.
 *
 * NOTE: At the time of writing, type definitions for the `tools` parameter
 *       have not yet landed in the official `openai` npm package. We cast
 *       the request payload to `any` to avoid TypeScript compilation errors
 *       while still benefiting from type-safety elsewhere.
 */

const webSearchToolParameters = z.object({
  /**
   * The search query to run against the public web.
   */
  query: z.string().describe("Search query to run on the public web"),
})

type WebSearchParams = z.infer<typeof webSearchToolParameters>

async function handler({ query }: WebSearchParams): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "o3", // The default model used across the code-base
      messages: [
        {
          role: "user",
          content: query,
        },
      ],
      // `tools` / `tool_choice` is still in beta – use `any` to bypass TS
      tools: [
        {
          type: "web_search",
        },
      ],
      tool_choice: {
        type: "tool",
        name: "web_search",
      },
    } as any)

    // We expect the model to reply with an answer directly.
    const content = completion.choices[0]?.message?.content?.trim() ?? ""
    return content
  } catch (error) {
    console.error("WebSearchTool error:", error)
    throw error
  }
}

export const createWebSearchTool = () =>
  createTool({
    name: "web_search",
    description: "Search the web using OpenAI's built-in browsing tool and return a concise answer.",
    schema: webSearchToolParameters,
    handler,
  })

export default createWebSearchTool

