import Link from "next/link"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import IssueSummaryCard from "@/components/playground/IssueSummaryCard"
import LongRunningWorkflowCard from "@/components/playground/LongRunningWorkflowCard"
import { Button } from "@/components/ui/button"
import { getGithubUser } from "@/lib/github/users"
import { getUserRoles } from "@/lib/neo4j/services/user"

export default async function WorkflowWorkersPlaygroundPage() {
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
        <h1 className="text-2xl font-bold">Workflow Workers Playground</h1>
        <p className="text-muted-foreground">
          Test workflow workers backed by BullMQ queues.
        </p>
        <div className="mt-3">
          <Link href="/playground">
            <Button variant="secondary" size="sm">
              Back to Playground
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <IssueSummaryCard />
        <LongRunningWorkflowCard />
      </div>
    </div>
  )
}

