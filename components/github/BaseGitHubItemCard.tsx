import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GitHubItem } from "@/lib/types/github"
import { getRepoFullNameFromIssue } from "@/lib/utils/utils-common"

interface BaseGitHubItemCardProps {
  item: GitHubItem
  children?: React.ReactNode // Optional slot for additional content
}

export default function BaseGitHubItemCard({
  item,
  children,
}: BaseGitHubItemCardProps) {
  // Get repository full name using the utility function
  const repoFullName = getRepoFullNameFromIssue(item)

  // Construct the issue URL
  const issueUrl =
    item.type === "issue"
      ? `/${repoFullName}/issues/${item.number}`
      : `/${repoFullName}/pulls/${item.number}`

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
          <Link href={issueUrl} className="hover:underline">
            <CardTitle>{item.title}</CardTitle>
          </Link>
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
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
