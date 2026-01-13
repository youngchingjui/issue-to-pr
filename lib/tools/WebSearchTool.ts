import type { WebSearchTool } from "openai/resources/responses/responses"

export function createWebSearchTool(
  overrides: Partial<WebSearchTool> = {}
): WebSearchTool {
  return {
    type: "web_search",
    ...overrides,
  }
}
