import { NextResponse } from "next/server"

import { auth } from "@/auth"

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Allow access to the auth routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // Allow access to the main landing page
  if (pathname === "/") {
    return NextResponse.next()
  }

  // Allow access to the /blog routes
  if (pathname.startsWith("/blog")) {
    return NextResponse.next()
  }

  // Allow access to the redirect page
  if (pathname === "/redirect") {
    return NextResponse.next()
  }

  // Protect specific routes that require authentication
  if (
    !req.auth &&
    (pathname.startsWith("/workflow-runs") ||
      // Protect user-specific routes, but not the redirect page
      (pathname.startsWith("/") &&
        pathname !== "/" &&
        !pathname.startsWith("/blog") &&
        pathname !== "/redirect"))
  ) {
    // Capture the original URL including search params
    const originalPath = req.nextUrl.pathname + req.nextUrl.search
    const newUrl = new URL("/redirect", req.nextUrl.origin)
    newUrl.searchParams.set("redirect", originalPath)
    return NextResponse.redirect(newUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
