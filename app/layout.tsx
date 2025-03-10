import "./globals.css"
import "./styles/custom.css"

import { Inter } from "next/font/google"
import { headers } from "next/headers"
import { SessionProvider } from "next-auth/react"

import { auth } from "@/auth"
import Navigation from "@/components/layout/Navigation"
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
  const headersList = headers()
  const pathname = headersList.get("x-pathname") || "/"
  const isLandingPage = pathname === "/"

  return (
    <html lang="en">
      <body
        className={inter.className}
        style={{ "--custom-amber": "#B45309" } as React.CSSProperties}
      >
        <SessionProvider session={session}>
          <Navigation isLandingPage={isLandingPage} />
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  )
}
