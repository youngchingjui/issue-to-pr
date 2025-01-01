import { redirect } from "next/navigation"

import { auth } from "@/auth"
import RepositoryList from "@/components/RepositoryList"

async function getRepositories(accessToken: string) {
  const res = await fetch("https://api.github.com/user/repos", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  return res.json()
}

export default async function Home() {
  const session = await auth()

  if (!session?.user) {
    redirect("/api/auth/signin")
  }

  const accessToken = session.user.accessToken
  if (!accessToken) {
    redirect("/api/auth/signin")
  }

  const repositories = await getRepositories(accessToken)

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">Select a Repository</h1>
        <RepositoryList repositories={repositories} />
      </div>
    </main>
  )
}
