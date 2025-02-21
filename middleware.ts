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

  // Protect dynamic /[username] routes
  if (!req.auth && pathname.startsWith("/")) {
    const newUrl = new URL("/", req.nextUrl.origin)
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
