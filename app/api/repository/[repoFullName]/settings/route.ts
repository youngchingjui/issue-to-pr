import { NextRequest } from "next/server"
import { getRepositorySettings, setRepositorySettings } from "@/lib/neo4j/repositories/repository"
import { repoSettingsSchema, RepoSettings } from "@/lib/types"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { checkRepoPermissions } from "@/lib/github/users"

// Helper: Extract repoFullName from Next.js dynamic route
function extractRepoFullName(param: string | undefined): string | null {
  if (!param) return null;
  // decode e.g. owner%2Frepo
  try { return decodeURIComponent(param); } catch { return null; }
}

export async function GET(req: NextRequest, { params }: { params: { repoFullName: string } }) {
  const repoFullName = extractRepoFullName(params.repoFullName)
  if (!repoFullName) {
    return new Response(JSON.stringify({ error: "Missing or invalid repoFullName" }), { status: 400 })
  }
  const settings = await getRepositorySettings(repoFullName)
  if (!settings) {
    // Return default if not set
    return new Response(JSON.stringify(repoSettingsSchema.parse({})), { status: 200 })
  }
  return new Response(JSON.stringify(settings), { status: 200 })
}

export async function PATCH(req: NextRequest, { params }: { params: { repoFullName: string } }) {
  const repoFullName = extractRepoFullName(params.repoFullName)
  if (!repoFullName) {
    return new Response(JSON.stringify({ error: "Missing or invalid repoFullName" }), { status: 400 })
  }
  // Auth/session check (only allow repo collaborators/owners)
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 })
  }
  const permissions = await checkRepoPermissions(repoFullName)
  if (!permissions?.isCollaborator) {
    return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403 })
  }
  let input
  try {
    input = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 })
  }
  let parsed: RepoSettings
  try {
    parsed = repoSettingsSchema.parse({ ...input, lastUpdated: new Date() })
  } catch (e) {
    return new Response(JSON.stringify({ error: "Settings validation failed", details: String(e) }), { status: 400 })
  }
  await setRepositorySettings(repoFullName, parsed)
  return new Response(JSON.stringify(parsed), { status: 200 })
}
