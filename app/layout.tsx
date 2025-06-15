import "./globals.css"
import "./styles/custom.css"

import { Inter } from "next/font/google"
import { SessionProvider } from "next-auth/react"

import { auth } from "@/auth"
import Navigation from "@/components/layout/Navigation"
import { TestButton } from "@/components/TestButton"
import { Toaster } from "@/components/ui/toaster"

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
          {children}
          <Toaster />
          {/* Floating TestButton only in development */}
          {process.env.NODE_ENV === "development" && (
            <div
              style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}
            >
              <TestButton />
            </div>
          )}
        </SessionProvider>
      </body>
    </html>
  )
}
