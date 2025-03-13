import IssueActions from "@/components/issues/IssueActions"
import PRActions from "@/components/pull-requests/PRActions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  if (!item.repository.full_name) return null

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
        <div className="space-y-2">
          <p>
            <strong>Number:</strong> #{item.number}
          </p>
          <p>
            <strong>State:</strong> {item.state}
          </p>
          <p>
            <strong>Created by:</strong> {item.user.login}
          </p>
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
              onWorkflowComplete={onWorkflowComplete}
              onWorkflowError={onWorkflowError}
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
      </CardContent>
    </Card>
  )
}
