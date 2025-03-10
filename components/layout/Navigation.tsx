import { GitBranch, Github, LogOut } from "lucide-react"
import * as motion from "motion/react-client"
import Link from "next/link"

import { auth, signIn, signOut } from "@/auth"
import { Button } from "@/components/ui/button"
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
                className="text-stone-700 group-hover:text-green-600 transition-colors"
                size={20}
              />
              <div className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-stone-800 to-green-600 text-sm sm:text-[14px] md:text-lg">
                Issue to PR
              </div>
            </motion.div>
          </Link>

          {/* Dynamic Navigation based on route */}
          {session?.user && <DynamicNavigation username={user!.login} />}

          {/* Sign in/out button */}
          <div className="ml-auto flex items-center space-x-4">
            {!session?.user ? (
              <form
                action={async () => {
                  "use server"
                  await signIn("github", { redirectTo: "/redirect" })
                }}
              >
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center px-3 py-1.5 bg-gradient-to-br from-stone-800 to-stone-700 text-stone-50 rounded-lg shadow-lg hover:shadow-xl hover:from-stone-700 hover:to-stone-600 group text-sm"
                >
                  <Github
                    className="mr-1.5 sm:mr-2.5 group-hover:text-green-400 transition-colors"
                    size={16}
                    aria-hidden="true"
                  />
                  <span className="hidden lg:inline">Sign in with GitHub</span>
                  <span className="lg:hidden">Sign in</span>
                </motion.button>
              </form>
            ) : (
              <form
                action={async () => {
                  "use server"
                  await signOut({ redirectTo: "/" })
                }}
              >
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="flex items-center px-4 py-2"
                >
                  <LogOut className="mr-2" size={20} />
                  Sign out
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  )
}
