import { NextRequest } from "next/server"

import { auth } from "@/auth"
import { checkRepoPermissions } from "@/lib/github/users"
import {
  getRepositorySettings,
  setRepositorySettings,
} from "@/lib/neo4j/services/repository"
import { RepoSettings, repoSettingsSchema } from "@/lib/types"
import { repoFullNameSchema } from "@/lib/types/github"

// Helper: Extract repoFullName from Next.js dynamic route
function extractRepoFullName(param: string | undefined): string | null {
  if (!param) return null
  // decode e.g. owner%2Frepo
  try {
    return decodeURIComponent(param)
  } catch {
    return null
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { repoFullName: string } }
) {
  const repoFullNameRaw = extractRepoFullName(params.repoFullName)
  const getParsed = repoFullNameSchema.safeParse(repoFullNameRaw)
  if (!getParsed.success) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid repoFullName" }),
      { status: 400 }
    )
  }
  const repoFullName = getParsed.data.fullName
  const settings = await getRepositorySettings(repoFullName)
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
  { params }: { params: { repoFullName: string } }
) {
  const repoFullNameRaw = extractRepoFullName(params.repoFullName)
  const patchParsed = repoFullNameSchema.safeParse(repoFullNameRaw)
  if (!patchParsed.success) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid repoFullName" }),
      { status: 400 }
    )
  }
  const repoFullName = patchParsed.data.fullName
  // Auth/session check (only allow repo collaborators/owners)
  const session = await auth()
  if (!session) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
    })
  }
  const permissions = await checkRepoPermissions(repoFullName)
  if (!permissions?.isCollaborator) {
    return new Response(JSON.stringify({ error: "Not authorized" }), {
      status: 403,
    })
  }
  let input
  try {
    input = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
    })
  }
  let parsed: RepoSettings
  try {
    parsed = repoSettingsSchema.parse({ ...input, lastUpdated: new Date() })
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: "Settings validation failed",
        details: String(e),
      }),
      { status: 400 }
    )
  }
  await setRepositorySettings(repoFullName, parsed)
  return new Response(JSON.stringify(parsed), { status: 200 })
}
