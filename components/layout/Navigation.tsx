import { GitBranch } from "lucide-react"
import * as motion from "motion/react-client"
import Link from "next/link"

import { auth } from "@/auth"
import { getGithubUser } from "@/lib/github/users"

import DynamicNavigation from "./DynamicNavigation"

export default async function Navigation() {
  const session = await auth()
  const user = session?.user ? await getGithubUser() : null

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
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

          {/* Dynamic Navigation based on route */}
          <DynamicNavigation
            username={user?.login || null}
            isAuthenticated={!!session?.user}
          />
        </div>
      </div>
    </motion.header>
  )
}
