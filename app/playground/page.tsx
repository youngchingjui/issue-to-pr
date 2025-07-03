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

export default async function PlaygroundPage() {
  return (
    <div className="space-y-8 px-4 py-8 md:container md:mx-auto">
      <AgentWorkflowClient defaultTools={DEFAULT_TOOLS} />
    </div>
  )
}
