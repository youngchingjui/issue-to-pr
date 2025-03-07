"use client"

import { Github, LayoutDashboard, LogOut } from "lucide-react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import {
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
  useSession,
} from "next-auth/react"

import Nav from "@/components/layout/Breadcrumb"
import { Button } from "@/components/ui/button"

export default function Navigation() {
  const { username, repo } = useParams() as {
    username: string | null
    repo: string | null
  }
  const pathname = usePathname()
  const { data: session } = useSession()

  const showBreadcrumbs = repo !== null && repo !== undefined
  const isWorkflowPage = pathname === "/workflow-runs"
  const isMainDashboard = pathname === `/${username}` || isWorkflowPage
  const isLandingPage = pathname === "/"

  const handleSignOut = async () => {
    await nextAuthSignOut({ redirect: true, callbackUrl: "/" })
  }

  const handleSignIn = async () => {
    await nextAuthSignIn("github", { redirect: true, callbackUrl: "/redirect" })
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo - always visible */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-bold">Issue to PR</span>
        </Link>

        {/* Landing page links */}
        {isLandingPage && (
          <nav className="flex items-center space-x-4">
            <Link href="/blogs" className="text-sm font-medium">
              Blogs
            </Link>
          </nav>
        )}

        {/* Breadcrumbs - only show in deep pages */}
        {showBreadcrumbs && <Nav />}

        {/* Main navigation - only show in main dashboard */}
        {isMainDashboard && username && (
          <nav className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="flex items-center"
            >
              <Link href={`/${username}`}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                My repositories
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="flex items-center"
            >
              <Link href="/workflow-runs">Workflows</Link>
            </Button>
          </nav>
        )}

        {/* Right side items - always visible */}
        <div className="ml-auto flex items-center space-x-4">
          {session?.user ? (
            <Button
              type="button"
              className="flex items-center px-4 py-2"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2" size={20} />
              Sign out
            </Button>
          ) : (
            <Button
              type="button"
              className="flex items-center px-4 py-2"
              onClick={handleSignIn}
            >
              <Github className="mr-2" size={20} />
              Login with GitHub
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
