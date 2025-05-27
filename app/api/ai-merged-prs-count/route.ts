import { NextResponse } from "next/server"
import { countAIMergedPRs } from "@/lib/github/pullRequests"

// TODO: Change this to your real repo full name (e.g. 'yourorg/yourrepo')
const REPO_FULL_NAME = process.env.PUBLIC_REPO_FULL_NAME || "yourorg/yourrepo"

export async function GET() {
  try {
    const count = await countAIMergedPRs({ repoFullName: REPO_FULL_NAME })
    return NextResponse.json({ count })
  } catch (e) {
    // error handling
    return NextResponse.json({ count: 0, error: String(e) }, { status: 500 })
  }
}
