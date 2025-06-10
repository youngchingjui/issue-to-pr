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

interface Props {
  params: {
    planId: string
    issueId: string
  }
}

function PlanSyncMetaBlock({ plan }: { plan: any }) {
  if (!plan) return null
  if (plan.sourceOfTruth === "github_comment") {
    return (
      <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded p-3 text-yellow-800">
        <strong>Plan is synced with a GitHub comment.</strong>
        <div className="text-xs mt-1">
          Comment ID: {plan.githubCommentId}
          <br />
          Status: {plan.syncStatus || "synced"}
          {!!plan.lastCommit && (
            <>
              <br />
              Commit: {plan.lastCommit}
            </>
          )}
          <br />
          Last synced:{" "}
          {plan.syncTimestamp
            ? new Date(plan.syncTimestamp).toLocaleString()
            : "unknown"}
        </div>
        {plan.githubCommentId && (
          <div className="mt-2">
            <a
              href={`https://github.com/{REPO_PLACEHOLDER}/issues/comments/${plan.githubCommentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-600 hover:text-blue-800"
            >
              View GitHub Comment
            </a>
          </div>
        )}
        <div className="mt-2 italic text-xs text-yellow-700">
          Edits must happen on GitHub. To edit in-app, un-sync Plan.
        </div>
      </div>
    )
  }
  return (
    <div className="mt-4 bg-green-50 border border-green-300 rounded p-3 text-green-800">
      <strong>Plan is stored in the app (Neo4j).</strong>
      <div className="text-xs mt-1">Source: Neo4j (app database)</div>
    </div>
  )
}

export default async function PlanPage({ params }: Props) {
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
          <PlanSyncMetaBlock plan={plan} />
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
                <p>
                  <strong>Source of Truth:</strong> {plan.sourceOfTruth}
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
