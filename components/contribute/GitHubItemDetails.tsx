import { useState } from "react"

import IssueActions from "@/components/issues/IssueActions"
import PRActions from "@/components/pull-requests/PRActions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import WorkflowStream from "@/components/workflow/WorkflowStream"
import { GitHubItem, WorkflowType } from "@/lib/types/github"

interface GitHubItemDetailsProps {
  item: GitHubItem
  isLoading: boolean
  activeWorkflow: WorkflowType | null
  onWorkflowStart: (workflow: WorkflowType) => void
  onWorkflowComplete: () => void
  onWorkflowError: () => void
}

export default function GitHubItemDetails({
  item,
  isLoading,
  activeWorkflow,
  onWorkflowStart,
  onWorkflowComplete,
  onWorkflowError,
}: GitHubItemDetailsProps) {
  const [workflowId, setWorkflowId] = useState<string | null>(null)

  console.log("workflowId", workflowId)
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              item.type === "issue"
                ? "bg-purple-100 text-purple-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {item.type === "issue" ? "Issue" : "Pull Request"}
          </span>
          <CardTitle>{item.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <p>
              <strong>Number:</strong> #{item.number}
            </p>
            <p>
              <strong>State:</strong> {item.state}
            </p>
            {item.user && (
              <p>
                <strong>Created by:</strong> {item.user.login}
              </p>
            )}
            <p>
              <strong>Created at:</strong>{" "}
              {new Date(item.created_at).toLocaleDateString()}
            </p>
            <p>
              <a
                href={item.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                View on GitHub
              </a>
            </p>

            {item.type === "issue" ? (
              <IssueActions
                issue={item}
                isLoading={isLoading}
                activeWorkflow={activeWorkflow}
                onWorkflowStart={onWorkflowStart}
                onWorkflowComplete={() => {
                  onWorkflowComplete()
                  setWorkflowId(null)
                }}
                onWorkflowError={() => {
                  onWorkflowError()
                  setWorkflowId(null)
                }}
                onWorkflowId={setWorkflowId}
              />
            ) : (
              <PRActions
                pr={item}
                isLoading={isLoading}
                activeWorkflow={activeWorkflow}
                onWorkflowStart={onWorkflowStart}
                onWorkflowComplete={onWorkflowComplete}
                onWorkflowError={onWorkflowError}
              />
            )}
          </div>

          {/* Show workflow stream when there's an active workflow */}
          {workflowId && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Workflow Progress</h3>
              <WorkflowStream
                workflowId={workflowId}
                onComplete={onWorkflowComplete}
                onError={onWorkflowError}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
