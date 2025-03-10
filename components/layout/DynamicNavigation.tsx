"use client"

import { BookOpen, DollarSign, HelpCircle } from "lucide-react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"

import Nav from "@/components/layout/Breadcrumb"
import { Button } from "@/components/ui/button"
import NavButton from "@/components/ui/nav-button"

// Landing page navigation items
const landingNavItems = [
  { icon: HelpCircle, label: "How to?", href: "/#how-to" },
  { icon: DollarSign, label: "Pricing", href: "/#pricing" },
  { icon: BookOpen, label: "Blog", href: "/blogs" },
]

export default function DynamicNavigation({
  username,
}: {
  username: string | null
}) {
  const pathname = usePathname()
  const { repo } = useParams() as { repo: string | null }

  const isLandingPage = pathname === "/"
  const isBlogsPage = pathname === "/blogs"
  const showBreadcrumbs = repo !== null && repo !== undefined

  if (isLandingPage || isBlogsPage) {
    return (
      <div className="hidden sm:flex items-center md:gap-0 lg:gap-6 ml-6">
        {landingNavItems.map((item) => (
          <NavButton
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Breadcrumbs - only show in deep pages */}
      {showBreadcrumbs && <Nav />}

      <nav className="flex items-center space-x-4 ml-auto">
        <Button variant="ghost" size="sm" asChild className="flex items-center">
          <Link href="/workflow-runs">Workflows</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild className="flex items-center">
          <Link href={`/${username}`}>Repositories</Link>
        </Button>
      </nav>
    </>
  )
}
