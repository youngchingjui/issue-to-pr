"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

import Nav from "@/components/layout/Breadcrumb"
import { Button } from "@/components/ui/button"

export default function DynamicNavigation() {
  const { username, repo } = useParams() as {
    username: string | null
    repo: string | null
  }

  const showBreadcrumbs = repo !== null && repo !== undefined

  return (
    <>
      {/* Breadcrumbs - only show in deep pages */}
      {showBreadcrumbs && <Nav />}

      <nav className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild className="flex items-center">
          <Link href={`/${username}`}>My repos</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild className="flex items-center">
          <Link href="/workflow-runs">Workflows</Link>
        </Button>
      </nav>
    </>
  )
}
