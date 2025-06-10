"use server"

import { ExternalLink } from "lucide-react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { listPlansForIssue } from "@/lib/neo4j/services/plan"

interface Props {
  repoFullName: string
  issueNumber: number
}

function PlanSyncStatusTag({ plan }: { plan: any }) {
  if (plan.sourceOfTruth === "github_comment") {
    return (
      <span className="bg-yellow-100 text-yellow-800 rounded px-2 py-1 text-xs ml-2">
        Synced to GitHub comment {plan.githubCommentId}
      </span>
    )
  }
  return (
    <span className="bg-green-100 text-green-800 rounded px-2 py-1 text-xs ml-2">
      Stored in app
    </span>
  )
}

export default async function IssuePlans({ repoFullName, issueNumber }: Props) {
  const plans = await listPlansForIssue({
    repoFullName,
    issueNumber,
  })

  if (plans.length === 0) {
    return null
  }

  // Just get the latest plan (for now)
  const plan = plans.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )[0]

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Resolution Plan <PlanSyncStatusTag plan={plan} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Created on {formatDate(plan.createdAt)}
          </div>
          <Link href={`/${repoFullName}/issues/${issueNumber}/plan/${plan.id}`}>
            <div className="flex items-center gap-2 text-sm text-primary hover:underline">
              <ExternalLink className="h-4 w-4" />
              View Full Plan
            </div>
          </Link>
        </div>
        <div className="text-sm">
          <div className="font-medium mb-2">Status: {plan.status}</div>
          <div className="whitespace-pre-wrap rounded-lg bg-muted p-4 max-h-48 overflow-y-auto">
            {plan.content}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
