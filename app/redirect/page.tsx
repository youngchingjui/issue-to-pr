import { redirect } from "next/navigation"

import { getGithubUser } from "@/lib/github/users"

// Use this page to redirect after login to user's /[username] page
// Easier to implement than middleware, for now
export default async function Redirect() {
  const user = await getGithubUser()

  if (!user) {
    redirect("/")
  }

  redirect(`/${user.login}`)
}
