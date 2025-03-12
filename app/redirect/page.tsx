import { redirect } from "next/navigation"

import { requireAuth } from "@/lib/auth/handle-auth-errors"
import { getGithubUserWithError } from "@/lib/github/users"

// Use this page to redirect after login to user's /[username] page
// Easier to implement than middleware, for now
export default async function Redirect() {
  const result = await getGithubUserWithError()
  const user = await requireAuth(result, "/")

  redirect(`/${user.login}`)
}
