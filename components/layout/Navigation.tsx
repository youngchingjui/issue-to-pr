import { GitBranch } from "lucide-react"
import Link from "next/link"

import { auth } from "@/auth"
import { getUserRoles } from "@/lib/neo4j/services/user"

import DynamicNavigation from "./DynamicNavigation"
import HideOnScroll from "./HideOnScroll"

export default async function Navigation() {
  const session = await auth()

  // Only try to get GitHub user if we have a session
  const githubUser = session?.profile?.login

  // Determine if the current user is an admin (has the "admin" role)
  let isAdmin = false
  if (githubUser) {
    try {
      const roles = await getUserRoles(githubUser)
      isAdmin = roles.includes("admin")
    } catch {
      // Swallow errors (e.g. user not found in DB) and treat as non-admin
      isAdmin = false
    }
  }

  return (
    <HideOnScroll className="sticky top-0 z-50 w-full bg-transparent">
      <div className="container max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center py-2">
          <Link href="/" className="group">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <GitBranch
                className="text-stone-700 group-hover:text-accent transition-colors"
                size={20}
              />
              <div className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-stone-800 to-accent text-sm sm:text-[14px] md:text-lg">
                Issue to PR
              </div>
            </div>
          </Link>

          {/* Dynamic Navigation based on route */}
          <DynamicNavigation
            isAuthenticated={!!session?.profile?.login}
            isAdmin={isAdmin}
            avatarUrl={session?.token?.picture}
          />
        </div>
      </div>
    </HideOnScroll>
  )
}
