"use server"

import { signIn, signOut } from "@/auth"
import { AUTH_CONFIG } from "@/lib/auth/config"

export async function signInWithGithub() {
  await signIn(AUTH_CONFIG.defaultProvider, { redirectTo: "/redirect" })
}

export async function signOutAndRedirect() {
  await signOut({ redirectTo: "/" })
}
