import nextDynamic from "next/dynamic"
import Image from "next/image"
import { redirect } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getGithubUser } from "@/lib/github/users"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"

export const dynamic = "force-dynamic"

const ApiKeyInput = nextDynamic(
  () => import("@/components/settings/APIKeyInput"),
  {
    ssr: false,
  }
)

export default async function SettingsPage() {
  const user = await getGithubUser()

  if (!user) {
    redirect("/redirect?redirect=/settings")
  }

  const existingKey = await getUserOpenAIApiKey()

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

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>OpenAI API Key</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-1">
              Required to generate plans and code. Create your API key{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-600"
              >
                here
              </a>
              .
            </p>
            <ApiKeyInput initialKey={existingKey ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Repository Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-1">
            Manage automation options for a specific repository.
          </p>
          <a
            href={`/${user.login}`}
            className="underline hover:text-blue-600"
          >
            Select a repository
          </a>
        </CardContent>
      </Card>
    </main>
  )
}
