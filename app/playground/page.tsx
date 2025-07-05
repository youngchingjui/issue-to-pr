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

import { auth } from "@/auth"
import AgentWorkflowClient from "@/components/agent-workflow/AgentWorkflowClient"
import OAuthTokenCard from "@/components/auth/OAuthTokenCard"

export default async function PlaygroundPage() {
  const session = await auth()
  const token = session?.token?.access_token

  return (
    <div className="space-y-8 px-4 py-8 md:container md:mx-auto">
      {token && <OAuthTokenCard token={token as string} />}
      <AgentWorkflowClient defaultTools={DEFAULT_TOOLS} />
    </div>
  )
}
