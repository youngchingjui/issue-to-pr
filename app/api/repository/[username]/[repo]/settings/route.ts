import { NextRequest } from "next/server"

import { auth } from "@/auth"
import { checkRepoPermissions } from "@/lib/github/users"
import {
  getRepositorySettings,
  setRepositorySettings,
} from "@/lib/neo4j/services/repository"
import { RepoSettings, repoSettingsSchema } from "@/lib/types"
import { RepoSettingsUpdateRequestSchema } from "@/lib/types/api/schemas"
import { repoFullNameSchema } from "@/lib/types/github"

// Route params definition for Next.js app router handlers
type RouteParams = {
  params: {
    username: string
    repo: string
  }
}

export async function GET(_: NextRequest, { params }: RouteParams) {
  // Validate and construct repo identifier from path segments
  const result = repoFullNameSchema.safeParse(
    `${params.username}/${params.repo}`
  )
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: "Invalid repository path parameters" }),
      { status: 400 }
    )
  }
  const repoFullName = result.data

  const settings = await getRepositorySettings(repoFullName)
  if (!settings) {
    // Return default settings if not found
    return new Response(JSON.stringify(repoSettingsSchema.parse({})), {
      status: 200,
    })
  }

  return new Response(JSON.stringify(settings), { status: 200 })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  // Validate repo identifier from path params
  const result = repoFullNameSchema.safeParse(
    `${params.username}/${params.repo}`
  )
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: "Invalid repository path parameters" }),
      { status: 400 }
    )
  }
  const repoFullName = result.data

  // Auth/session check (only allow repo collaborators/owners)
  const session = await auth()
  if (!session) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
    })
  }

  const permissions = await checkRepoPermissions(repoFullName.fullName)
  if (!permissions?.isCollaborator) {
    return new Response(JSON.stringify({ error: "Not authorized" }), {
      status: 403,
    })
  }

  // Parse and validate request body (client-supplied settings)
  const json = await req.json()
  const body = RepoSettingsUpdateRequestSchema.safeParse(json)
  if (!body.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid JSON body",
        details: body.error.message,
      }),
      { status: 400 }
    )
  }

  let validated: RepoSettings
  try {
    validated = repoSettingsSchema.parse({
      ...body.data,
      lastUpdated: new Date(),
    })
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: "Settings validation failed",
        details: String(e),
      }),
      { status: 400 }
    )
  }

  await setRepositorySettings(repoFullName, validated)
  return new Response(JSON.stringify(validated), { status: 200 })
}
