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

import Link from "next/link"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getGithubUser } from "@/lib/github/users"
import { getUserRoles } from "@/lib/neo4j/services/user"
import OAuthTokenCard from "@/components/auth/OAuthTokenCard"
import AgentWorkflowClient from "@/components/playground/AgentWorkflowClient"
import ApplyPatchCard from "@/components/playground/ApplyPatchCard"
import DockerodeExecCard from "@/components/playground/DockerodeExecCard"
import IssueTitleCard from "@/components/playground/IssueTitleCard"
import RipgrepSearchCard from "@/components/playground/RipgrepSearchCard"
import SpeechToTextCard from "@/components/playground/SpeechToTextCard"
import UserRolesCard from "@/components/playground/UserRolesCard"
import WriteFileCard from "@/components/playground/WriteFileCard"
import { Button } from "@/components/ui/button"

export default async function PlaygroundPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/")
  }

  const githubUser = await getGithubUser()
  const roles = githubUser ? await getUserRoles(githubUser.login).catch(() => []) : []
  const isAdmin = roles.includes("admin")
  if (!isAdmin) {
    redirect("/")
  }

  const token = session?.token?.access_token as string | undefined

  return (
    <div className="space-y-8 px-4 py-8 md:container md:mx-auto">
      <AgentWorkflowClient defaultTools={DEFAULT_TOOLS} />
      <IssueTitleCard />
      <SpeechToTextCard />
      <UserRolesCard />
      <RipgrepSearchCard />
      <DockerodeExecCard />
      <WriteFileCard />
      <ApplyPatchCard />
      {token ? <OAuthTokenCard token={token} /> : null}
      <div>
        <Link href="/playground/evals">
          <Button variant="outline" size="sm">
            LLM Evaluations
          </Button>
        </Link>
      </div>
    </div>
  )
}

