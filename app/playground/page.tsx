import Link from "next/link"
import { redirect } from "next/navigation"

import SimpleChatButton from "@/app/playground/components/SimpleChatButton"
import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getGithubUser } from "@/lib/github/users"
import { getUserRoles } from "@/lib/neo4j/services/user"

export default async function PlaygroundHubPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/")
  }

  const githubUser = await getGithubUser()
  const roles = githubUser
    ? await getUserRoles(githubUser.login).catch(() => [])
    : []
  const isAdmin = roles.includes("admin")
  if (!isAdmin) {
    redirect("/")
  }

  return (
    <div className="space-y-8 px-4 py-8 md:container md:mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Playground</h1>
        <p className="text-muted-foreground">
          Explore tools, UI components, and evaluation sandboxes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Tools</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Try agent tools, repo utilities, and workflow actions.
            </p>
            <Link href="/playground/tools">
              <Button size="sm">Open Tools</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Components</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Preview reusable UI components with mock data.
            </p>
            <Link href="/playground/components">
              <Button size="sm">Open Components</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evals</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Run LLM-as-judge style evaluations.
            </p>
            <Link href="/playground/evals">
              <Button size="sm">Open Evals</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Simple OpenAI Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Click to call OpenAI via our shared LLM port.
            </p>
            <SimpleChatButton />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
