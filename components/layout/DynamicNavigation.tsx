"use client"

import { BookOpen, DollarSign, Github, HelpCircle, LogOut } from "lucide-react"
import * as motion from "motion/react-client"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"

import Nav from "@/components/layout/Breadcrumb"
import { Button } from "@/components/ui/button"
import NavButton from "@/components/ui/nav-button"
import { signInWithGithub, signOutAndRedirect } from "@/lib/actions/auth"

// Landing page navigation items
const landingNavItems = [
  { icon: HelpCircle, label: "How to?", href: "/#how-to" },
  { icon: DollarSign, label: "Pricing", href: "/#pricing" },
  { icon: BookOpen, label: "Blog", href: "/blogs" },
]

export default function DynamicNavigation({
  username,
  isAuthenticated,
}: {
  username: string | null
  isAuthenticated: boolean
}) {
  const pathname = usePathname()
  const { repo } = useParams() as { repo: string | null }

  const isLandingPage = pathname === "/"
  const isBlogsPage = pathname === "/blogs"
  const showBreadcrumbs = repo !== null && repo !== undefined

  if (isLandingPage || isBlogsPage) {
    return (
      <div className="flex items-center justify-between flex-1 ml-6">
        <div className="hidden sm:flex items-center md:gap-0 lg:gap-6">
          {landingNavItems.map((item) => (
            <NavButton
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
            />
          ))}
        </div>

        <div className="ml-auto flex items-center space-x-4">
          {!isAuthenticated ? (
            <form action={signInWithGithub}>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center px-3 py-1.5 bg-gradient-to-br from-stone-800 to-stone-700 text-stone-50 rounded-lg shadow-lg hover:shadow-xl hover:from-stone-700 hover:to-stone-600 group text-sm"
              >
                <Github
                  className="mr-1.5 sm:mr-2.5"
                  size={16}
                  aria-hidden="true"
                />
                <span className="hidden lg:inline">Sign in with GitHub</span>
                <span className="lg:hidden">Sign in</span>
              </motion.button>
            </form>
          ) : (
            <div className="flex items-center gap-4">
              <Link href={`/${username}`}>
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center px-4 py-2"
                >
                  <Github className="mr-2" size={20} />
                  My Repos
                </Button>
              </Link>
              <form action={signOutAndRedirect}>
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
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <>
        {/* Breadcrumbs - only show in deep pages */}
        {showBreadcrumbs && <Nav />}

        <nav className="flex items-center space-x-4 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="flex items-center"
          >
            <Link href="/workflow-runs">Workflows</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="flex items-center"
          >
            <Link href={`/${username}`}>Repositories</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="flex items-center"
          >
            <Link href="/contribute">Contribute</Link>
          </Button>
          <form action={signOutAndRedirect}>
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
        </nav>
      </>
    )
  }
}
