"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"

export default function IssueNotFound() {
  const pathname = usePathname()
  // Extract repository information from pathname using regex
  const match = pathname.match(/\/([^\/]+)\/([^\/]+)\/issues/)
  const issuesListUrl = match ? `/${match[1]}/${match[2]}/issues` : "/"

  return (
    <div className="container mx-auto p-4">
      <div className="rounded-lg bg-muted p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Issue Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The issue you&apos;re looking for doesn&apos;t exist or you may not
          have access to it.
        </p>
        <Button asChild variant="default">
          <Link href={issuesListUrl}>
            {match ? "Back to Issues" : "Go Home"}
          </Link>
        </Button>
      </div>
    </div>
  )
}
