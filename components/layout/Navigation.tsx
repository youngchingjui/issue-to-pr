import { Github, LogOut } from "lucide-react"
import Link from "next/link"

import { auth, signIn } from "@/auth"
import { signOut } from "@/auth"
import { Button } from "@/components/ui/button"

import DynamicNavigation from "./DynamicNavigation"

export default async function Navigation() {
  const session = await auth()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo - always visible */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-bold">Issue to PR</span>
        </Link>

        {/* Dynamic navigation parts */}
        {session?.user && <DynamicNavigation />}

        {/* Right side items - always visible */}
        <div className="ml-auto flex items-center space-x-4">
          {session?.user ? (
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
          ) : (
            <form
              action={async () => {
                "use server"
                await signIn("github", { redirectTo: "/redirect" })
              }}
            >
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="flex items-center px-4 py-2"
              >
                <Github className="mr-2" size={20} />
                Login with GitHub
              </Button>
            </form>
          )}
        </div>
      </div>
    </header>
  )
}
