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
import OAuthTokenCard from "@/components/auth/OAuthTokenCard"
import AgentWorkflowClient from "@/components/playground/AgentWorkflowClient"
import DockerodeExecCard from "@/components/playground/DockerodeExecCard"
import PlanVersionCard from "@/components/playground/PlanVersionCard"
import RipgrepSearchCard from "@/components/playground/RipgrepSearchCard"
import SWRDemoCard from "@/components/playground/SWRDemoCard"
import WriteFileCard from "@/components/playground/WriteFileCard"

// Simple client component for showing feedback messages
function FeedbackMessage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string }
}) {
  "use client"

  if (searchParams.success === "plan-created") {
    return (
      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
        ✅ Plan version created successfully!
      </div>
    )
  }

  if (searchParams.error) {
    return (
      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
        ❌ Error: {decodeURIComponent(searchParams.error)}
      </div>
    )
  }

  return null
}

export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string }
}) {
  const session = await auth()
  const token = session?.token?.access_token as string | undefined

  return (
    <div className="space-y-8 px-4 py-8 md:container md:mx-auto">
      <FeedbackMessage searchParams={searchParams} />
      <AgentWorkflowClient defaultTools={DEFAULT_TOOLS} />
      <SWRDemoCard />
      <RipgrepSearchCard />
      <DockerodeExecCard />
      <WriteFileCard />
      <PlanVersionCard />
      {token ? <OAuthTokenCard token={token} /> : null}
    </div>
  )
}
