"use server"

import { signIn, signOut } from "@/auth"

export async function signInWithGithub() {
  await signIn("github", { redirectTo: "/redirect" })
}

export async function signOutAndRedirect() {
  await signOut({ redirectTo: "/" })
}
