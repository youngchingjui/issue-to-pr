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

// Compose full repo name (owner/repo) from route params
function toRepoFullName(params: { username: string; repo: string }) {
  return `${params.username}/${params.repo}`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string; repo: string } }
) {
  const repoFullName = toRepoFullName(params)
  const parsed = repoFullNameSchema.safeParse(repoFullName)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid repoFullName" }),
      { status: 400 }
    )
  }

  const settings = await getRepositorySettings(parsed.data.fullName)
  if (!settings) {
    // Return default if not set
    return new Response(JSON.stringify(repoSettingsSchema.parse({})), {
      status: 200,
    })
  }

  return new Response(JSON.stringify(settings), { status: 200 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { username: string; repo: string } }
) {
  const repoFullName = toRepoFullName(params)
  const parsed = repoFullNameSchema.safeParse(repoFullName)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid repoFullName" }),
      { status: 400 }
    )
  }

  // Auth/session check (only allow repo collaborators/owners)
  const session = await auth()
  if (!session) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
    })
  }

  const permissions = await checkRepoPermissions(parsed.data.fullName)
  if (!permissions?.isCollaborator) {
    return new Response(JSON.stringify({ error: "Not authorized" }), {
      status: 403,
    })
  }

  let inputRaw
  try {
    inputRaw = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
    })
  }

  // Validate against client-facing schema then add server-managed fields
  let validatedClient
  try {
    validatedClient = RepoSettingsUpdateRequestSchema.parse(inputRaw)
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: "Settings validation failed",
        details: String(e),
      }),
      { status: 400 }
    )
  }

  const validated: RepoSettings = repoSettingsSchema.parse({
    ...validatedClient,
    lastUpdated: new Date(),
  })

  await setRepositorySettings(parsed.data.fullName, validated)
  return new Response(JSON.stringify(validated), { status: 200 })
}
