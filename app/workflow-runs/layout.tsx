import { ArrowLeft, LogOut } from "lucide-react"
import Link from "next/link"
import type React from "react"

import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { getGithubUser } from "@/lib/github/users"

export default async function WorkflowRunsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const user = await getGithubUser()

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" size="icon" asChild className="mr-2">
            <Link href={`/${session.user?.name}`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Dashboard</span>
            </Link>
          </Button>
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">Issue to PR</span>
          </Link>
          <Link
            href={`/${user.login}`}
            className="mr-6 flex items-center space-x-2"
          >
            <span className="font-bold">My repos</span>
          </Link>
          <div className="ml-auto flex items-center space-x-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/api/auth/signout">
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Sign out</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
