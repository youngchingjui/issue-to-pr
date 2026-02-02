import "./globals.css"
import "./styles/custom.css"

import { Metadata } from "next"
import { Inter } from "next/font/google"
import { SessionProvider } from "next-auth/react"

import Navigation from "@/components/layout/Navigation"
import ErrorListener from "@/components/system/ErrorListener"
import { Toaster } from "@/components/ui/toaster"
import { auth } from "@/lib/auth/cached"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
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

  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/issue-to-pr-logo.svg" />
        <link rel="alternate icon" href="/favicon.ico" />
        <title>Issue-to-PR: Automated GitHub Issue Resolution</title>
        <meta name="description" content="Automatically resolve your GitHub issues and create Pull Requests using AI." />
      </head>
      <body
        className={inter.className}
        style={{ "--custom-amber": "#B45309" } as React.CSSProperties}
      >
        <SessionProvider session={session}>
          <Navigation />
          <ErrorListener />
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  )
}
