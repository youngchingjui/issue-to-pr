import "./globals.css"
import "./styles/custom.css"

import { LayoutDashboard, LogOut } from "lucide-react"
import { Inter } from "next/font/google"
import Link from "next/link"
import { SessionProvider } from "next-auth/react"

import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/toaster"
import { getGithubUser } from "@/lib/github/users"
import { GitHubUser } from "@/lib/types"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Issue-to-PR: Automated GitHub Issue Resolution",
  description:
    "Automatically resolve your GitHub issues and create Pull Requests using AI.",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const user = await getGithubUser()

  console.log(user?.login)
  return (
    <html lang="en">
      <body
        className={inter.className}
        style={{ "--custom-amber": "#B45309" } as React.CSSProperties}
      >
        <SessionProvider session={session}>
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
              <Link href="/" className="mr-6 flex items-center space-x-2">
                <span className="font-bold">Issue to PR</span>
              </Link>
              <nav className="flex items-center space-x-6">
                <Link href="/blogs" className="text-sm font-medium">
                  Blog
                </Link>
              </nav>
              <div className="ml-auto flex items-center space-x-4">
                {user ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex items-center"
                    >
                      <Link href={`/${user.login}`}>
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Dashboard
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href="/api/auth/signout">
                        <LogOut className="h-4 w-4" />
                        <span className="sr-only">Sign out</span>
                      </Link>
                    </Button>
                  </>
                ) : (
                  <Button variant="default" asChild>
                    <Link href="/api/auth/signin">Sign In</Link>
                  </Button>
                )}
              </div>
            </div>
          </header>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  )
}
