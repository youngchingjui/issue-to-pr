import "./globals.css"
import "./styles/custom.css"

import { Inter } from "next/font/google"
import { SessionProvider } from "next-auth/react"

import { auth } from "@/auth"
import Navigation from "@/components/layout/Navigation"
import TokenErrorToast from "@/components/common/TokenErrorToast"
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
      <body
        className={inter.className}
        style={{ "--custom-amber": "#B45309" } as React.CSSProperties}
      >
        <SessionProvider session={session}>
          <Navigation />
          <TokenErrorToast />
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  )
}
