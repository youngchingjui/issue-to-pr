import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { createTask } from "@/lib/neo4j/services/task"
import { getGithubUser } from "@/lib/github/users"
import { repoFullNameSchema } from "@/lib/types/github"

export const dynamic = "force-dynamic"

const CreateTaskRequestSchema = z.object({
  repoFullName: repoFullNameSchema,
  title: z.string().min(1),
  body: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const parseResult = CreateTaskRequestSchema.safeParse(json)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const { repoFullName, title, body } = parseResult.data

    const user = await getGithubUser()
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const task = await createTask({
      repoFullName: repoFullName.fullName,
      title,
      body,
      createdBy: user.login,
    })

    return NextResponse.json({ success: true, task })
  } catch (error) {
    console.error("[tasks] Task creation error:", error)
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    )
  }
}
