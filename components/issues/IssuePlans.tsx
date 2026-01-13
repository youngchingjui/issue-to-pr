"use server"

import { ExternalLink } from "lucide-react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { listPlansForIssue } from "@/lib/neo4j/services/plan"

interface Props {
  repoFullName: string
  issueNumber: number
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
        <CardTitle>Resolution Plan</CardTitle>
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
