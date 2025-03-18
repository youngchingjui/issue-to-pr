import { notFound } from "next/navigation"
import { Suspense } from "react"

import GitHubItemDetails from "@/components/contribute/GitHubItemDetails"
import ApiKeyInput from "@/components/settings/APIKeyInput"
import { getIssue } from "@/lib/github/issues"
import { GitHubItem } from "@/lib/types/github"

interface Props {
  params: {
    username: string
    repo: string
    issue_number: string
  }
}

export default async function IssueDetailsPage({ params }: Props) {
  const { username, repo, issue_number } = params
  const issueNumber = parseInt(issue_number)

  if (isNaN(issueNumber)) {
    notFound()
  }

  try {
    const rawIssueData = await getIssue({
      fullName: `${username}/${repo}`,
      issueNumber,
    })

    // Add the type field required by GitHubItem
    const issueData: GitHubItem = {
      ...rawIssueData,
      type: "issue",
    }

    return (
      <main className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {username} / {repo} - Issue #{issue_number}
            </h1>
            <h2 className="text-xl mb-4">{issueData.title}</h2>
          </div>
          <ApiKeyInput />
        </div>

        <Suspense fallback={<div>Loading issue details...</div>}>
          <GitHubItemDetails
            item={issueData}
            isLoading={false}
            activeWorkflow={null}
            onWorkflowStart={(workflow) => {
              // These handlers will need to be moved to a client component
              console.log("Workflow started:", workflow)
            }}
            onWorkflowComplete={() => {
              console.log("Workflow completed")
            }}
            onWorkflowError={() => {
              console.log("Workflow error")
            }}
          />
        </Suspense>
      </main>
    )
  } catch (error) {
    console.error("Error fetching issue:", error)
    if (error instanceof Error && error.message.includes("Not Found")) {
      notFound()
    }
    throw error
  }
}
