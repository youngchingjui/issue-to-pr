import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/auth"
import { getLocalRepoDir } from "@/lib/fs"
import { checkIfGitExists, cloneRepo } from "@/lib/git"
import { getIssue } from "@/lib/github-old"
import { GitHubRepository } from "@/lib/types"
import { getCloneUrlWithAccessToken } from "@/lib/utils"
import { resolveIssue } from "@/lib/workflows/resolveIssue"

type RequestBody = {
  issueNumber: number
  repo: GitHubRepository
  apiKey: string
}

export async function POST(request: NextRequest) {
  const { issueNumber, repo, apiKey }: RequestBody = await request.json()
  const repoName = repo.name
  const repoUrl = repo.url
  const session = await auth()
  const token = session?.user?.accessToken

  try {
    console.debug("[DEBUG] Starting POST request handler")

    if (typeof issueNumber !== "number") {
      console.debug("[DEBUG] Invalid issue number provided:", issueNumber)
      return NextResponse.json(
        { error: "Invalid issueNumber provided." },
        { status: 400 }
      )
    }

    // Get tempDir for repo
    const tempDir = await getLocalRepoDir(repo.full_name)

    // Check if .git and codebase exist in tempDir
    // If not, clone the repo
    // If so, checkout the branch
    console.debug(`[DEBUG] Checking if .git and codebase exist in ${tempDir}`)
    const gitExists = await checkIfGitExists(tempDir)
    if (!gitExists) {
      // Clone the repo
      console.debug(`[DEBUG] Cloning repo: ${repoUrl}`)

      // Attach access token to cloneUrl
      const cloneUrlWithToken = getCloneUrlWithAccessToken(
        repo.full_name,
        token
      )

      await cloneRepo(cloneUrlWithToken, tempDir)
    }

    console.debug(`[DEBUG] Fetching issue #${issueNumber}`)
    const issue = await getIssue(repoName, issueNumber)

    // Enter resolve issue workflow
    // This workflow starts with a coordinator agent, that will call other agents to figure out what to do
    // And resolve the issue

    await resolveIssue(issue, repoName, apiKey)

    return NextResponse.json(
      { message: "Finished agent workflow." },
      { status: 200 }
    )
  } catch (error) {
    console.error("[ERROR] Fatal error in POST handler:", error)
    return NextResponse.json(
      { error: "Failed to resolve issue." },
      { status: 500 }
    )
  }
}
