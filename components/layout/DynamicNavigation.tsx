"use client"

import {
  BookOpen,
  DollarSign,
  Github,
  HelpCircle,
  LogIn,
  Menu,
} from "lucide-react"
import * as motion from "motion/react-client"
import Link from "next/link"
import { useParams, usePathname, useSearchParams } from "next/navigation"

import SignOutButton from "@/components/common/SignOutButton"
import Nav from "@/components/layout/Breadcrumb"
import { Button } from "@/components/ui/button"
import NavButton from "@/components/ui/nav-button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { signInWithGithub } from "@/lib/actions/auth"

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
  const searchParams = useSearchParams()
  const { repo } = useParams() as { repo: string | null }

  // Get the redirect URL from search params, fallback to current pathname
  const redirectPath = searchParams.get("redirect") || pathname

  const isLandingPage = pathname === "/"
  const isBlogsPage = pathname === "/blogs"
  const showBreadcrumbs = repo !== null && repo !== undefined

  if (isLandingPage || isBlogsPage) {
    return (
      <div className="flex items-center flex-1 ml-6">
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

        <div className="hidden sm:flex ml-auto items-center space-x-4">
          {!isAuthenticated ? (
            <form action={signInWithGithub.bind(null, redirectPath)}>
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
              <Link href={`/issues`}>
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center px-4 py-2"
                >
                  <Github className="mr-2" size={20} />
                  My Issues
                </Button>
              </Link>
              <SignOutButton />
            </div>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto sm:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="sm:hidden w-64 p-4">
            <nav className="mt-4 flex flex-col gap-4">
              {landingNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-6 space-y-2">
              {!isAuthenticated ? (
                <form action={signInWithGithub.bind(null, redirectPath)}>
                  <Button type="submit" className="w-full">
                    Sign in with GitHub
                  </Button>
                </form>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link href={`/issues`}>
                    <Button variant="outline" className="w-full">
                      My Issues
                    </Button>
                  </Link>
                  <SignOutButton />
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <>
        {/* Breadcrumbs - only show in deep pages */}
        {showBreadcrumbs && <Nav />}

        <nav className="hidden sm:flex items-center space-x-4 ml-auto">
          <Button variant="ghost" size="sm" asChild className="flex items-center">
            <Link href="/workflow-runs">Workflows</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="flex items-center">
            <Link href="/agent-workflow">Agent Workflow</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="flex items-center">
            <Link href="/issues">Issues</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="flex items-center">
            <Link href="/contribute">Contribute</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="flex items-center">
            <Link href="/settings">Settings</Link>
          </Button>
          <SignOutButton />
        </nav>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto sm:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="sm:hidden w-64 p-4">
            <nav className="mt-4 flex flex-col gap-4">
              <Link href="/workflow-runs">Workflows</Link>
              <Link href="/agent-workflow">Agent Workflow</Link>
              <Link href="/issues">Issues</Link>
              <Link href="/contribute">Contribute</Link>
              <Link href="/settings">Settings</Link>
            </nav>
            <div className="mt-6">
              <SignOutButton />
            </div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  // Not authenticated - show sign in button
  return (
    <>
      <nav className="hidden sm:flex items-center space-x-4 ml-auto">
        <form action={signInWithGithub.bind(null, redirectPath)}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="flex items-center px-4 py-2"
          >
            <LogIn className="mr-2" size={20} />
            Sign in with GitHub
          </Button>
        </form>
      </nav>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="ml-auto sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:hidden w-64 p-4">
          <form action={signInWithGithub.bind(null, redirectPath)}>
            <Button type="submit" className="w-full">
              Sign in with GitHub
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
