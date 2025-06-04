import Image from "next/image"
import { redirect } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getGithubUser } from "@/lib/github/users"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const user = await getGithubUser()

  if (!user) {
    redirect("/redirect?redirect=/settings")
  }

  return (
    <main className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {user.avatar_url && (
              <Image
                src={user.avatar_url}
                alt={user.login}
                width={64}
                height={64}
                className="rounded-full"
              />
            )}
            <div>
              <p className="text-lg font-semibold">{user.name ?? user.login}</p>
              <p className="text-sm text-muted-foreground">{user.login}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
