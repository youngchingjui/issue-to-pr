import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import { getRepoFromString } from "@/lib/github/content"

const Body = z.object({ fullName: z.string().regex(/^[^/]+\/[^/]+$/) })

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.token?.access_token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { fullName } = Body.parse(await request.json())

    const repo = await getRepoFromString(fullName)

    const payload = {
      repoFullName: repo.full_name,
      owner: repo.owner?.login ?? fullName.split("/")[0],
      name: repo.name,
      description: repo.description,
      defaultBranch: repo.default_branch,
      visibility: repo.private ? "PRIVATE" : "PUBLIC",
      url: repo.html_url,
      cloneUrl: repo.clone_url,
    }

    return NextResponse.json(payload)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: err.errors },
        { status: 400 }
      )
    }

    // Basic error mapping
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    if (msg.includes("403")) {
      return NextResponse.json({ error: msg }, { status: 403 })
    }

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
