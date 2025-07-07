"use server"

import { createRipgrepSearchTool } from "@/lib/tools/RipgrepSearchTool"
import { asRepoEnvironment, RepoEnvironment } from "@/lib/types"

export async function runRipgrepSearch({
  env,
  query,
  ignoreCase,
  hidden,
  follow,
  mode,
}: {
  env: RepoEnvironment | string
  query: string
  ignoreCase?: boolean
  hidden?: boolean
  follow?: boolean
  mode?: "literal" | "regex"
}): Promise<string> {
  const environment = asRepoEnvironment(env)
  const tool = createRipgrepSearchTool(environment)
  return await tool.handler({ query, ignoreCase, hidden, follow, mode })
}
