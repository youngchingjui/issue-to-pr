import Link from "next/link"
import type React from "react"

import Nav from "@/components/Breadcrumb"

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">Issue to PR</span>
          </Link>
          <Nav />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
