import Link from "next/link"
import ReactMarkdown from "react-markdown"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PlanWithDetails } from "@/lib/types"

interface Props {
  plan: PlanWithDetails
}

export function PlanDetail({ plan }: Props) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date)
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Plan Details</CardTitle>
            <CardDescription>
              Created on {formatDate(plan.createdAt)}
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

        {plan.issue && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Related Issue</h3>
            <Link
              href={`/${plan.issue.repoFullName}/issues/${plan.issue.number}`}
              className="text-primary hover:underline"
            >
              #{plan.issue.number}
            </Link>
          </div>
        )}

        {plan.workflow && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Workflow Information</h3>
            <div>
              <p>
                <strong>Type:</strong> {plan.workflow.type}
              </p>
              <p>
                <strong>ID:</strong> {plan.workflow.id}
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
  )
}
