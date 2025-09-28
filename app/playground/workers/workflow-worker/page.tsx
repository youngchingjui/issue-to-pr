import Link from "next/link"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import AutoResolveIssueCard from "@/components/playground/AutoResolveIssueCard"
import IssueSummaryCard from "@/components/playground/IssueSummaryCard"
import LongRunningWorkflowCard from "@/components/playground/LongRunningWorkflowCard"
import { Button } from "@/components/ui/button"
import { getUserRoles } from "@/lib/neo4j/services/user"

export default async function WorkflowWorkersPlaygroundPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/")
  }

  // Prefer GitHub login from session; this avoids extra API calls
  const githubLogin = session.profile?.login
  if (!githubLogin) {
    redirect("/")
  }

  const roles = await getUserRoles(githubLogin).catch(() => [])
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
          <Button asChild variant="secondary" size="sm">
            <Link href="/playground">Back to Playground</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <IssueSummaryCard />
        <LongRunningWorkflowCard />
        <AutoResolveIssueCard githubLogin={githubLogin} />
      </div>
    </div>
  )
}

