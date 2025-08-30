"use client"

import { Github } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"

import ShineButton from "@/components/ui/shine-button"
import { signInWithGithub, signInWithGithub2 } from "@/lib/actions/auth"

export default function AuthButton() {
  const { data: session } = useSession()
  const isAuthenticated = !!session?.user

  return (
    <>
      {isAuthenticated ? (
        <Link href="/issues" className="inline-block">
          <ShineButton className="text-base sm:text-lg px-4 sm:px-5 md:px-6 py-3 bg-accent text-accent-foreground hover:bg-accent/70">
            Go to issues
          </ShineButton>
        </Link>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <form action={signInWithGithub.bind(null, "/issues")}>
            <ShineButton className="text-base sm:text-lg px-4 sm:px-5 md:px-6 py-3 bg-accent text-accent-foreground hover:bg-accent/70">
              <Github size={20} />
              Connect your code base to start
            </ShineButton>
          </form>
          <form action={signInWithGithub2.bind(null, "/issues")}>
            <ShineButton className="text-base sm:text-lg px-4 sm:px-5 md:px-6 py-3 bg-secondary text-secondary-foreground hover:bg-secondary/70">
              <Github size={20} />
              Login with GitHub App 2
            </ShineButton>
          </form>
        </div>
      )}
    </>
  )
}

