import { redirect } from "next/navigation"
import { getGithubUser } from "@/lib/github/users"

export const dynamic = "force-dynamic"

function validateInternalRedirectPath(path: string | null): string | null {
  // Must start with single slash and not double slash
  if (typeof path === "string" && path.startsWith("/") && !path.startsWith("//")) {
    return path
  }
  return null
}

export default async function Redirect({ searchParams }: { searchParams?: Record<string, string> }) {
  // searchParams is not automatically injected in server components in older Next.js,
  // so get from process if not present
  let redirectTo: string | null = null

  if (typeof window === 'undefined') {
    // On the server: get from process URL (globalThis?)
    // We need to use currentUrl, parse params manually
    if (typeof require !== 'undefined') {
      // @ts-ignore
      const url = require('next/headers').headers().get('x-next-url') || ''
      if (url && url.includes('?')) {
        const params = new URLSearchParams(url.substring(url.indexOf('?')))
        redirectTo = validateInternalRedirectPath(params.get('redirect'))
      }
    }
  } else if (searchParams && searchParams.redirect) {
    redirectTo = validateInternalRedirectPath(searchParams.redirect)
  }

  // Fallback: try to parse from global search if didn't get via above
  if (!redirectTo && typeof window === 'undefined') {
    // Parse from URL of current request if available
    if (typeof require !== 'undefined') {
      // Best effort for legacy next/server
      try {
        // @ts-ignore
        const url = require('next/headers').headers().get('referer') || ''
        if (url && url.includes('?')) {
          const params = new URLSearchParams(url.substring(url.indexOf('?')))
          redirectTo = validateInternalRedirectPath(params.get('redirect'))
        }
      } catch {}
    }
  }

  const user = await getGithubUser()

  if (!user) {
    redirect("/")
  }

  // Final fallback attempt for Next.js Request context
data
  if (!redirectTo && typeof window === 'undefined') {
    try {
      // @ts-ignore
      const nextUrl = require('next/headers').headers().get('next-url')
      if (nextUrl && nextUrl.includes('?')) {
        const params = new URLSearchParams(nextUrl.substring(nextUrl.indexOf('?')))
        redirectTo = validateInternalRedirectPath(params.get('redirect'))
      }
    } catch {}
  }

  if (redirectTo) {
    redirect(redirectTo)
  } else {
    redirect(`/${user.login}`)
  }
}
