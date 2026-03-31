import nextDynamic from "next/dynamic"
import Image from "next/image"
import { redirect } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getGithubUser } from "@/lib/github/users"
import {
  getUserAnthropicApiKey,
  getUserLLMProvider,
  getUserOpenAIApiKey,
} from "@/lib/neo4j/services/user"

export const dynamic = "force-dynamic"

const OpenAIKeyInput = nextDynamic(
  () => import("@/components/settings/APIKeyInput"),
  {
    ssr: false,
  }
)

const AnthropicKeyInput = nextDynamic(
  () => import("@/components/settings/AnthropicAPIKeyInput"),
  { ssr: false }
)

const ModelProviderSelect = nextDynamic(
  () => import("@/components/settings/ModelProviderSelect"),
  { ssr: false }
)

export default async function SettingsPage() {
  const user = await getGithubUser()

  if (!user) {
    redirect("/redirect?redirect=/settings")
  }

  const [openAIKey, anthropicKey, provider] = await Promise.all([
    getUserOpenAIApiKey(),
    getUserAnthropicApiKey(),
    getUserLLMProvider(),
  ])

  // Only pass whether keys exist — never send plaintext keys to the client
  const hasOpenAIKey = !!openAIKey
  const hasAnthropicKey = !!anthropicKey

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
          <CardTitle>Model Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Choose which AI provider to use for workflows. You can store keys for
            both and switch anytime.
          </p>
          <ModelProviderSelect initialProvider={provider} />
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>OpenAI API Key</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-1">
              Required to generate plans and code when using OpenAI. Create your
              API key{" "}
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
            <OpenAIKeyInput hasExistingKey={hasOpenAIKey} />
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Anthropic API Key</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-1">
              Use Claude models by adding your Anthropic key. Create a key{" "}
              <a
                href="https://console.anthropic.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-600"
              >
                here
              </a>
              .
            </p>
            <AnthropicKeyInput hasExistingKey={hasAnthropicKey} />
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
          <a href={`/${user.login}`} className="underline hover:text-blue-600">
            Select a repository
          </a>
        </CardContent>
      </Card>
    </main>
  )
}

