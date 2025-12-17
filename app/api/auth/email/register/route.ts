import { NextResponse } from "next/server"

import { registerUserEmailPassword } from "@/lib/neo4j/services/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const email = String(body?.email ?? "").trim()
  const password = String(body?.password ?? "")
  const confirmPassword = String(body?.confirmPassword ?? "")

  if (!email || !password || !confirmPassword) {
    return NextResponse.json(
      { error: "Email, password and confirmPassword are required" },
      { status: 400 }
    )
  }
  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: "Passwords do not match" },
      { status: 400 }
    )
  }

  const res = await registerUserEmailPassword({ email, password })
  if (!res.ok) {
    const status = res.error === "User already exists" ? 409 : 400
    return NextResponse.json({ error: res.error }, { status })
  }
  return NextResponse.json({ ok: true })
}

