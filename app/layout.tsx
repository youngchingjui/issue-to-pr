import "./globals.css"
import "./styles/custom.css"

import { Metadata } from "next"
import { Inter } from "next/font/google"
import { SessionProvider } from "next-auth/react"

import Navigation from "@/components/layout/Navigation"
import ErrorListener from "@/components/system/ErrorListener"
import { Toaster } from "@/components/ui/toaster"
import { authWithDiagnostics } from "@/lib/auth/diagnostics"

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
  const session = await authWithDiagnostics("layout.tsx")

  return (
    <html lang="en">
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
