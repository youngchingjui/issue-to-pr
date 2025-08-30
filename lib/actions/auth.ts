"use server"

import { signIn, signOut } from "@/auth"
import { AUTH_CONFIG } from "@/lib/auth/config"

export async function signInWithGithub(redirectTo?: string) {
  await signIn(AUTH_CONFIG.defaultProvider, {
    redirectTo: redirectTo || "/redirect",
  })
}

export async function signInWithGithub2(redirectTo?: string) {
  await signIn("github-app-2", {
    redirectTo: redirectTo || "/redirect",
  })
}

export async function signOutAndRedirect() {
  await signOut({ redirectTo: "/" })
}

