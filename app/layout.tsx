import "./globals.css"
import "./styles/custom.css"

import { Inter } from "next/font/google"
import { SessionProvider } from "next-auth/react"
import { useRouter } from "next/router";

import { auth } from "@/auth"
import { Toaster } from "@/components/ui/toaster"
import NavigationBar from "@/components/NavigationBar";

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
  const router = useRouter();
  const { username = '', repo = '' } = router.query;
  
  return (
    <html lang="en">
      <body
        className={inter.className}
        style={{ "--custom-amber": "#B45309" } as React.CSSProperties}
      >
        <NavigationBar username={username as string} repo={repo as string} />
        <SessionProvider session={session}>{children}</SessionProvider>
        <Toaster />
      </body>
    </html>
  )
}
