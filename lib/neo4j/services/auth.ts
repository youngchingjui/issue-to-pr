"use server"

import bcrypt from "bcryptjs"

import { n4j } from "@/lib/neo4j/client"
import * as userAuthRepo from "@/lib/neo4j/repositories/userAuth"

export async function registerUserEmailPassword(params: {
  email: string
  password: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = params.email.trim().toLowerCase()
  const password = params.password

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Invalid email" }
  }
  if (!password || password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" }
  }

  const session = await n4j.getSession()
  try {
    const existing = await session.executeRead((tx) =>
      userAuthRepo.findUserByEmail(tx, email)
    )
    if (existing) {
      return { ok: false, error: "User already exists" }
    }

    const passwordHash = await bcrypt.hash(password, 10)

    await session.executeWrite((tx) =>
      userAuthRepo.createUserWithEmailPassword(tx, email, passwordHash)
    )

    return { ok: true }
  } finally {
    await session.close()
  }
}

export async function verifyEmailPassword(params: {
  email: string
  password: string
}): Promise<
  | { ok: true; user: { id: string; email: string; name: string } }
  | { ok: false; error: string }
> {
  const email = params.email.trim().toLowerCase()
  const password = params.password

  const session = await n4j.getSession()
  try {
    const existing = await session.executeRead((tx) =>
      userAuthRepo.findUserByEmail(tx, email)
    )
    if (!existing) {
      return { ok: false, error: "Invalid credentials" }
    }
    const match = await bcrypt.compare(password, existing.passwordHash)
    if (!match) {
      return { ok: false, error: "Invalid credentials" }
    }
    return { ok: true, user: { id: email, email, name: email } }
  } finally {
    await session.close()
  }
}

