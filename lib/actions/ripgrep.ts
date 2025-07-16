"use server"

import { z } from "zod"

import { createRipgrepSearchTool } from "@/lib/tools/RipgrepSearchTool"
import { searchParameters } from "@/lib/tools/RipgrepSearchTool"
import { asRepoEnvironment, RepoEnvironment } from "@/lib/types"

type Params = {
  env: RepoEnvironment | string
  searchParams: z.input<typeof searchParameters>
}
export async function runRipgrepSearch({
  env,
  searchParams,
}: Params): Promise<string> {
  const environment = asRepoEnvironment(env)
  const tool = createRipgrepSearchTool(environment)
  const params = searchParameters.parse(searchParams)
  return await tool.handler(params)
}
