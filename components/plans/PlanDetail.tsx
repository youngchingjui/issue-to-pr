import Link from "next/link"

import { PlanStatusUpdater } from "@/components/plans/PlanStatusUpdater"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PlanProperties } from "@/lib/types/plan"
import { WorkflowMetadata } from "@/lib/types/workflow"

interface Props {
  plan: {
    id: string
    status: PlanProperties["status"]
    type: string
    createdAt: Date
    message: {
      id: string
      type: "llm_response"
      timestamp: string
      data: {
        content: string
        model: string
      }
    }
    workflow?: {
      id: string
      metadata: WorkflowMetadata
    }
    issue?: {
      number: number
      repoFullName: string
    }
  }
  showStatusUpdater?: boolean
}

export function PlanDetail({ plan, showStatusUpdater = true }: Props) {
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
          {showStatusUpdater && (
            <PlanStatusUpdater planId={plan.id} initialStatus={plan.status} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Plan Content</h3>
          <div className="whitespace-pre-wrap rounded-lg bg-muted p-4">
            {plan.message.data.content}
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
                <strong>Type:</strong> {plan.workflow.metadata.workflowType}
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
                <strong>Type:</strong> {plan.type}
              </p>
              <p>
                <strong>Status:</strong> {plan.status}
              </p>
            </div>
            <div>
              <p>
                <strong>Plan ID:</strong> {plan.id}
              </p>
              <p>
                <strong>Model:</strong> {plan.message.data.model}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
