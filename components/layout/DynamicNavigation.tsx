"use client"

import {
  BookOpen,
  DollarSign,
  Github,
  HelpCircle,
  LogIn,
  LogOut,
  Menu,
} from "lucide-react"
import * as motion from "motion/react-client"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { signOut } from "next-auth/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import NavButton from "@/components/ui/nav-button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { signInWithGithub, signOutAndRedirect } from "@/lib/actions/auth"

// Landing page navigation items
const landingNavItems = [
  { icon: HelpCircle, label: "How to?", href: "/#how-to" },
  { icon: DollarSign, label: "Pricing", href: "/#pricing" },
  { icon: BookOpen, label: "Blog", href: "/blogs" },
]

// Shared navigation items for authenticated users
const authenticatedNavItems = (
  isAdmin: boolean
): Array<{ label: string; href: string }> => {
  const items = [
    { label: "Workflows", href: "/workflow-runs" },
    { label: "Issues", href: "/issues" },
    { label: "PRDs", href: "/prds" }, // NEW navigation item
    { label: "Kanban", href: "/kanban" },
    { label: "Contribute", href: "/contribute" },
    { label: "Settings", href: "/settings" },
  ]

  if (isAdmin) {
    // Insert Playground right after Workflows (index 1 after insertion of Issues)
    items.splice(2, 0, { label: "Playground", href: "/playground" })
  }

  return items
}

export default function DynamicNavigation({
  isAuthenticated,
  isAdmin,
  avatarUrl,
}: {
  isAuthenticated: boolean
  isAdmin: boolean
  avatarUrl?: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get the redirect URL from search params, fallback to current pathname
  const redirectPath = searchParams.get("redirect") || pathname

  const isLandingPage = pathname === "/"
  const isBlogsPage = pathname === "/blogs"

  // Show the landing page navigation *only* for unauthenticated users.
  if (!isAuthenticated && (isLandingPage || isBlogsPage)) {
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
              <form action={signInWithGithub.bind(null, redirectPath)}>
                <Button type="submit" className="w-full">
                  Sign in with GitHub
                </Button>
              </form>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  if (isAuthenticated) {
    const navItems = authenticatedNavItems(isAdmin)

    const handleSignOut = async () => {
      await signOut({ redirect: false })
      await signOutAndRedirect()
    }

    return (
      <div className="flex items-center ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center justify-center focus:outline-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl || "/next.svg"}
                alt="Profile"
                className="w-8 h-8 rounded-full border"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {navItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleSignOut}
              className="cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  // Not authenticated - show sign in button (non-landing pages)
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

