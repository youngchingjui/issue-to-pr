"use server"
import "server-only"

import { signOut } from "@/auth"

export async function generateCode(formData: FormData) {
  const content = formData.get("content") as string
  const response = await fetch("/api/generate", {
    method: "POST",
    body: JSON.stringify({ content }),
  })
  return response.json()
}

export async function commitChanges(formData: FormData) {
  const content = formData.get("content") as string
  const response = await fetch("/api/commit", {
    method: "POST",
    body: JSON.stringify({ content }),
  })
  return response.json()
}

export async function pushToGithub() {
  const response = await fetch("/api/push", {
    method: "POST",
  })
  return response.json()
}

export async function createPR() {
  const response = await fetch("/api/pr", {
    method: "POST",
  })
  return response.json()
}

export { signOut }
