import { redirect } from "next/navigation"

import { getGithubUser } from "@/lib/github/users"

// Use this page to redirect after login to user's /[username] page
// Easier to implement than middleware, for now
export const dynamic = "force-dynamic"

export default async function Redirect({
  searchParams,
}: {
  searchParams: { redirect?: string }
}) {
  const user = await getGithubUser()

  // If no user but we have a redirect URL, redirect to home with the redirect parameter preserved
  if (!user && searchParams.redirect) {
    redirect(`/?redirect=${encodeURIComponent(searchParams.redirect)}`)
  } else if (!user) {
    redirect("/")
  }

  // If we have a redirect URL, use it
  if (searchParams.redirect) {
    // Ensure the redirect URL is safe (starts with / and is not an external URL)
    const redirectUrl = searchParams.redirect
    if (redirectUrl.startsWith("/") && !redirectUrl.includes("://")) {
      redirect(redirectUrl)
    }
  }

  // Default fallback to user's profile page
  redirect(`/${user.login}`)
}
