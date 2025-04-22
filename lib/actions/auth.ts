"use server"

import { signIn, signOut } from "@/auth"
import { AUTH_CONFIG } from "@/lib/auth/config"

export async function signInWithGithub(formData?: FormData) {
  let redirectTo = "/redirect"
  if (formData && formData.has("redirect")) {
    const r = formData.get("redirect")
    if (typeof r === "string" && r.startsWith("/")) {
      // Only trust absolute (internal) paths
      redirectTo = r
    }
  }
  await signIn(AUTH_CONFIG.defaultProvider, { redirectTo })
}

export async function signOutAndRedirect() {
  await signOut({ redirectTo: "/" })
}
