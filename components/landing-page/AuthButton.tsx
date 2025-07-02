"use client"

import { Github } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import ShineButton from "@/components/ui/shine-button"
import { signInWithGithub } from "@/lib/actions/auth"

export default function AuthButton() {
  const { data: session } = useSession()
  const isAuthenticated = !!session?.user

  return (
    <>
      {isAuthenticated ? (
        <Link href="/issues" className="inline-block">
          <ShineButton className="bg-accent px-4 py-3 text-base text-accent-foreground hover:bg-accent/70 sm:px-5 sm:text-lg md:px-6">
            Go to issues
          </ShineButton>
        </Link>
      ) : (
        <form action={signInWithGithub.bind(null, "/issues")}>
          <Button className="bg-primary px-4 py-3 text-base text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring sm:px-5 sm:text-lg md:px-6">
            <Github size={20} />
            Sign in with GitHub
          </Button>
        </form>
      )}
      <p className="relative z-[1] mt-3 text-sm text-stone-600">
        {!isAuthenticated && "to start updating your code"}
      </p>
    </>
  )
}
