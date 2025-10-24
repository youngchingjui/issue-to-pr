import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { listUserAppRepositories } from "@/lib/github/repos"

export async function GET() {
  const session = await auth()
  if (!session?.token?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const repos = await listUserAppRepositories()
    const fullNames = repos.map((r) => r.full_name).filter(Boolean)
    return NextResponse.json({ fullNames })
  } catch (e) {
    console.error("[api/github/repositories]", e)
    return NextResponse.json({ error: "Failed to list repositories" }, { status: 500 })
  }
}

