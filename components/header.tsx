"use client"

import Link from "next/link"
import { Session } from "next-auth"
import { signOut } from "next-auth/react"

type HeaderProps = {
  session: Session | null
}

export default function Header({ session }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="w-full py-6 flex items-center justify-between border-b border-indigo-500 lg:border-none">
          <div className="flex items-center">
            <Link href="/">
              <span className="sr-only">Issue to PR</span>
            </Link>
          </div>
          <div className="ml-10 space-x-4">
            {session ? (
              <button
                onClick={() => signOut()}
                className="inline-block bg-indigo-500 py-2 px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-opacity-75"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/api/auth/signin"
                className="inline-block bg-indigo-500 py-2 px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-opacity-75"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
