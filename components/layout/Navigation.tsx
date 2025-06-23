"use client"

import { GitBranch, Menu } from "lucide-react"
import * as motion from "motion/react-client"
import Link from "next/link"
import { useEffect, useState } from "react"

import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { useMediaQuery } from "@/lib/hooks/use-media-query"
import DynamicNavigation from "./DynamicNavigation"

// Helper for async session fetching (mimic server-side call)
async function fetchSessionAndUser() {
  // @ts-ignore
  const { auth } = await import("@/auth")
  // @ts-ignore
  const { getGithubUser } = await import("@/lib/github/users")
  const session = await auth()
  const githubUser = session?.user ? await getGithubUser() : null
  return { session, githubUser }
}

export default function Navigation() {
  // Mobile detection (Tailwind 'sm' breakpoint and down)
  const isMobile = useMediaQuery("max-sm")
  const [session, setSession] = useState<any>(null)
  const [githubUser, setGithubUser] = useState<any>(null)
  // For hydration safety (prevent server/client mismatch)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetchSessionAndUser().then(({ session, githubUser }) => {
      setSession(session)
      setGithubUser(githubUser)
    })
  }, [])

  if (!mounted) {
    // Avoid mismatches until client-side
    return null
  }

  // Props for nav child
  const navProps = {
    username: githubUser?.login ?? session?.user?.name ?? null,
    isAuthenticated: !!session?.user,
  }

  return (
    <header
      className="sticky top-0 z-50 w-full border-b backdrop-blur bg-background/95 supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center py-2">
          {/* Logo - always visible */}
          <Link href="/" className="group">
            <motion.div
              className="flex items-center gap-1 sm:gap-1.5"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <GitBranch
                className="text-stone-700 group-hover:text-accent transition-colors"
                size={20}
              />
              <div className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-stone-800 to-accent text-sm sm:text-[14px] md:text-lg">
                Issue to PR
              </div>
            </motion.div>
          </Link>

          {/* Navigation/Menu Placement */}
          {isMobile ? (
            <div className="ml-auto">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="flex items-center px-2 py-1 focus:outline-none" aria-label="Open Menu">
                    <Menu size={28} />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="pt-10 w-64 max-w-xs">
                  {/* Optionally repeat logo inside drawer */}
                  <div className="mb-4">
                    <Link href="/" className="group flex items-center gap-2">
                      <GitBranch size={18} className="text-accent" />
                      <span className="font-bold text-lg">Issue to PR</span>
                    </Link>
                  </div>
                  <DynamicNavigation {...navProps} />
                </SheetContent>
              </Sheet>
            </div>
          ) : (
            // Desktop inline nav
            <DynamicNavigation {...navProps} />
          )}
        </div>
      </div>
    </header>
  )
}
