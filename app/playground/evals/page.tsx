import Link from "next/link"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import PlanEvalCard from "@/components/playground/PlanEvalCard"
import { Button } from "@/components/ui/button"
import { getGithubUser } from "@/lib/github/users"
import { getUserRoles } from "@/lib/neo4j/services/user"

export default async function EvalsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/")
  }

  const githubUser = await getGithubUser()
  const roles = githubUser
    ? await getUserRoles(githubUser.login).catch(() => [])
    : []
  if (!roles.includes("admin")) {
    redirect("/")
  }

  return (
    <div className="container mx-auto py-8 space-y-4">
      <div>
        <h1 className="text-3xl font-bold mb-2">LLM Evaluations</h1>
        <p className="text-muted-foreground">
          This page will run LLM-as-Judge evaluations on various workflows.
        </p>
      </div>
      <p>
        Evaluations will score each workflow run on custom questions and return
        structured results.
      </p>
      <Link href="/playground">
        <Button variant="secondary" size="sm">
          Back to Playground
        </Button>
      </Link>
      <PlanEvalCard />
    </div>
  )
}
