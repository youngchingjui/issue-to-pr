"use server"
const DEFAULT_TOOLS = [
  "apply_patch",
  "manage_branch",
  "commit_changes",
  "container_exec",
  "create_pull_request",
  "file_check",
  "get_file_content",
  "get_issue",
  "create_issue_comment",
  "ripgrep_search",
  "sync_branch_to_remote",
  "write_file",
]

import AgentWorkflowClient from "@/components/agent-workflow/AgentWorkflowClient"
import { auth } from "@/auth"
import { getGithubUser } from "@/lib/github/users"
import Link from "next/link"

export default async function PlaygroundPage() {
  const session = await auth()
  const login = session?.user ? (await getGithubUser())?.login : null

  if (login !== "youngchingjui") {
    return (
      <div className="space-y-4 px-4 py-8 md:container md:mx-auto text-center">
        <h1 className="text-2xl font-semibold">Unauthorized</h1>
        <p>You do not have access to view this page.</p>
        <Link className="text-blue-600 underline" href="/">
          Return home
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8 px-4 py-8 md:container md:mx-auto">
      <AgentWorkflowClient defaultTools={DEFAULT_TOOLS} />
    </div>
  )
}
