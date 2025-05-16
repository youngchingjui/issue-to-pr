import Link from "next/link"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getPlanWithDetails } from "@/lib/neo4j/services/plan"

interface PageProps {
  params: {
    planId: string
    issueId: string
  }
}

export default async function PlanPage({ params }: PageProps) {
  const { planId } = params
  const { plan, workflow, issue } = await getPlanWithDetails(planId)

  if (!plan) {
    notFound()
  }

  return (
    <div className="flex min-h-screen items-start justify-center py-8 px-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Plan Details</CardTitle>
              <CardDescription>
                Created on {plan.createdAt.toLocaleDateString()}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Plan Content</h3>
            <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg bg-muted p-4">
              <ReactMarkdown>{plan.content}</ReactMarkdown>
            </div>
          </div>

          {issue && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Related Issue</h3>
              <Link
                href={`/${issue.repoFullName}/issues/${issue.number}`}
                className="text-primary hover:underline"
              >
                #{issue.number}
              </Link>
            </div>
          )}

          {workflow && (
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Workflow Information
              </h3>
              <div>
                <p>
                  <strong>Type:</strong> {workflow.type}
                </p>
                <p>
                  <strong>ID:</strong> {workflow.id}
                </p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-2">Metadata</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p>
                  <strong>Status:</strong> {plan.status}
                </p>
              </div>
              <div>
                <p>
                  <strong>Plan ID:</strong> {plan.id}
                </p>
                <p>
                  <strong>Version:</strong> {plan.version}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
