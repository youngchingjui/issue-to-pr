import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

import getOctokit from "@/lib/github"
import { getFileSha, getRepoFromString } from "@/lib/github/content"

export async function POST(req: Request) {
  try {
    const octokit = await getOctokit()
    if (!octokit) {
      return NextResponse.json(
        { error: "Not authenticated with GitHub" },
        { status: 401 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const repoFullName = (formData.get("repoFullName") as string | null)?.trim()

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (!repoFullName) {
      return NextResponse.json(
        { error: "Missing repoFullName" },
        { status: 400 }
      )
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image uploads are supported" },
        { status: 400 }
      )
    }

    // Get default branch
    const repo = await getRepoFromString(repoFullName)
    const branch = repo.default_branch

    const [owner, repoName] = repoFullName.split("/")
    if (!owner || !repoName) {
      return NextResponse.json(
        { error: "Invalid repoFullName" },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64Content = Buffer.from(arrayBuffer).toString("base64")

    const now = new Date()
    const year = now.getUTCFullYear()
    const month = String(now.getUTCMonth() + 1).padStart(2, "0")
    const id = uuidv4()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "image"
    const path = `issue-uploads/${year}/${month}/${id}-${safeName}`

    const existingSha = await getFileSha({
      repoFullName,
      path,
      branch,
    })

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path,
      message: `chore: add issue image upload ${safeName}`,
      content: base64Content,
      branch,
      ...(existingSha ? { sha: existingSha } : {}),
    })

    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${encodeURIComponent(
      branch
    )}/${path
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/")}`

    return NextResponse.json(
      {
        url: rawUrl,
        markdown: `![${safeName}](${rawUrl})`,
        path,
        branch,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[images/upload] Error:", error)
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    )
  }
}

